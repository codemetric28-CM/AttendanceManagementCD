const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Break = require('../models/Break');
const Leave = require('../models/Leave');
const {
  jwtRequired,
  formatUser,
  formatAttendance,
  formatLeave
} = require('../middleware/auth');

const router = express.Router();

function todayStr() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}`;
}

router.get('/dashboard-stats', jwtRequired('admin'), async (req, res) => {
  try {
    const today = todayStr();
    const month = today.slice(0, 7);

    const total_employees = await User.countDocuments({ role: 'employee' });

    const todayAtts = await Attendance.find({ date: today });
    const today_stats = {
      present_today: todayAtts.filter((a) => ['Present', 'Late'].includes(a.status)).length,
      late_today: todayAtts.filter((a) => a.status === 'Late').length,
      half_day_today: todayAtts.filter((a) => a.status === 'Half Day').length,
      leave_today: todayAtts.filter((a) => a.status === 'On Leave').length
    };

    const pending_leaves_count = await Leave.countDocuments({ status: 'Pending' });

    const monthAtts = await Attendance.find({ date: { $regex: `^${month}` } });
    const monthly_chart_data = {};
    monthAtts.forEach((a) => {
      monthly_chart_data[a.status] = (monthly_chart_data[a.status] || 0) + 1;
    });

    const employees = await User.find({ role: 'employee' });
    const dept_chart_data = {};
    employees.forEach((e) => {
      dept_chart_data[e.department] = (dept_chart_data[e.department] || 0) + 1;
    });

    return res.status(200).json({
      total_employees,
      today_stats,
      pending_leaves_count,
      monthly_chart_data,
      dept_chart_data
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

router.get('/employees', jwtRequired('admin'), async (req, res) => {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const department = (req.query.department || '').trim();

    const filter = {};
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await User.find(filter).sort({ _id: -1 });
    return res.status(200).json({ employees: employees.map(formatUser) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load employees' });
  }
});

router.post('/employees', jwtRequired('admin'), async (req, res) => {
  try {
    const data = req.body || {};
    const employee_id = (data.employee_id || '').trim();
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const password = (data.password || '').trim();
    const role = (data.role || 'employee').trim().toLowerCase();
    const department = (data.department || 'General').trim();
    const designation = (data.designation || 'Staff').trim();
    const phone = (data.phone || '').trim();
    const join_date = (data.join_date || todayStr()).trim();

    if (!employee_id || !name || !email || !password) {
      return res.status(400).json({
        error: 'Employee ID, Name, Email, and Password are required'
      });
    }

    const exists = await User.findOne({
      $or: [{ email }, { employee_id }]
    });
    if (exists) {
      return res.status(400).json({
        error: 'An employee with this Email or Employee ID already exists'
      });
    }

    await User.create({
      employee_id,
      name,
      email,
      password_hash: await bcrypt.hash(password, 10),
      role,
      department,
      designation,
      phone,
      join_date
    });

    return res.status(201).json({ message: 'Employee added successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add employee' });
  }
});

router.put('/employees/:userId', jwtRequired('admin'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = req.body || {};
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Employee not found' });

    if ((data.name || '').trim()) user.name = data.name.trim();
    if ((data.role || '').trim()) user.role = data.role.trim();
    if ((data.department || '').trim()) user.department = data.department.trim();
    if ((data.designation || '').trim()) user.designation = data.designation.trim();
    if (data.phone !== undefined) user.phone = (data.phone || '').trim();

    const password = (data.password || '').trim();
    if (password) {
      user.password_hash = await bcrypt.hash(password, 10);
    }

    await user.save();
    return res.status(200).json({ message: 'Employee updated successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/employees/:userId', jwtRequired('admin'), async (req, res) => {
  try {
    const userId = req.params.userId;
    if (userId === req.currentUser.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account!' });
    }

    await User.findByIdAndDelete(userId);
    await Attendance.deleteMany({ user_id: userId });
    await Break.deleteMany({ user_id: userId });
    await Leave.deleteMany({ user_id: userId });

    return res.status(200).json({ message: 'Employee removed successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
});

router.get('/attendance', jwtRequired('admin'), async (req, res) => {
  try {
    const selected_date = (req.query.date || todayStr()).trim();
    const month = (req.query.month || '').trim();
    const search = (req.query.search || '').trim().toLowerCase();
    const department = (req.query.department || '').trim();
    const status = (req.query.status || '').trim();

    const attFilter = {};
    if (month) attFilter.date = { $regex: `^${month}` };
    else if (selected_date) attFilter.date = selected_date;
    if (status) attFilter.status = status;

    let records = await Attendance.find(attFilter).sort({ date: -1, _id: -1 });

    const userIds = [...new Set(records.map((r) => r.user_id.toString()))];
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    let result = [];
    for (const att of records) {
      const u = userMap[att.user_id.toString()];
      if (!u) continue;
      if (department && u.department !== department) continue;
      if (search) {
        const hay = `${u.name} ${u.employee_id} ${u.email}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }
      const break_count = await Break.countDocuments({ attendance_id: att._id });
      result.push(
        formatAttendance(att, {
          employee_id: u.employee_id,
          user_name: u.name,
          user_email: u.email,
          department: u.department,
          designation: u.designation,
          break_count
        })
      );
    }

    return res.status(200).json({ attendance: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load attendance' });
  }
});

router.get('/leaves', jwtRequired('admin'), async (req, res) => {
  try {
    const status = (req.query.status || '').trim();
    const filter = {};
    if (status) filter.status = status;

    const leaves = await Leave.find(filter).sort({ _id: -1 });
    const userIds = [...new Set(leaves.map((l) => l.user_id.toString()))];
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const result = leaves.map((l) => {
      const u = userMap[l.user_id.toString()] || {};
      return formatLeave(l, {
        employee_id: u.employee_id || '',
        user_name: u.name || '',
        user_email: u.email || '',
        department: u.department || ''
      });
    });

    return res.status(200).json({ leaves: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load leaves' });
  }
});

router.post('/leave/:leaveId/action', jwtRequired('admin'), async (req, res) => {
  try {
    const leaveId = req.params.leaveId;
    const data = req.body || {};
    const raw = (data.action || '').trim();
    const action = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (action !== 'Approved' && action !== 'Rejected') {
      return res.status(400).json({ error: 'Action must be Approved or Rejected' });
    }
    const admin_remarks = (data.remarks || '').trim();

    const leave = await Leave.findById(leaveId);
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    leave.status = action;
    leave.admin_remarks = admin_remarks;
    await leave.save();

    if (action === 'Approved') {
      const start = new Date(leave.start_date + 'T00:00:00');
      const end = new Date(leave.end_date + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const pad = (n) => String(n).padStart(2, '0');
        const dt_str = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const existing = await Attendance.findOne({
          user_id: leave.user_id,
          date: dt_str
        });
        if (existing) {
          existing.status = 'On Leave';
          existing.notes = `Approved Leave: ${leave.leave_type}`;
          await existing.save();
        } else {
          await Attendance.create({
            user_id: leave.user_id,
            date: dt_str,
            status: 'On Leave',
            notes: `Approved Leave: ${leave.leave_type}`
          });
        }
      }
    }

    return res.status(200).json({ message: `Leave application ${action} successfully.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to process leave' });
  }
});

module.exports = router;

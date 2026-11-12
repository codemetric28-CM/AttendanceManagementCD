const express = require('express');
const bcrypt = require('bcryptjs');
const Attendance = require('../models/Attendance');
const Break = require('../models/Break');
const Leave = require('../models/Leave');
const User = require('../models/User');
const config = require('../config/config');
const {
  jwtRequired,
  formatAttendance,
  formatBreak,
  formatLeave
} = require('../middleware/auth');

const router = express.Router();

function nowParts() {
  const now = new Date();
  // Convert to IST (UTC+5:30) for date/time strings
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}`;
  const timeStr = `${pad(istNow.getUTCHours())}:${pad(istNow.getUTCMinutes())}:${pad(istNow.getUTCSeconds())}`;
  const nowStr = `${todayStr} ${timeStr}`;
  return { now, todayStr, nowStr };
}

function formatTime12(date) {
  // Convert UTC date to IST for display
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const h = istDate.getUTCHours();
  const m = String(istDate.getUTCMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
}

router.get('/dashboard-summary', jwtRequired('employee'), async (req, res) => {
  try {
    const userId = req.currentUser.id;
    const { todayStr } = nowParts();
    const currMonth = todayStr.slice(0, 7);

    const todayAtt = await Attendance.findOne({ user_id: userId, date: todayStr });
    let activeBreak = null;

    if (todayAtt) {
      const brk = await Break.findOne({
        attendance_id: todayAtt._id,
        status: 'ongoing'
      }).sort({ _id: -1 });
      if (brk) activeBreak = formatBreak(brk);
    }

    const monthAtts = await Attendance.find({
      user_id: userId,
      date: { $regex: `^${currMonth}` }
    });

    const monthly_stats = {
      present_days: monthAtts.filter((a) => ['Present', 'Late'].includes(a.status)).length,
      late_days: monthAtts.filter((a) => a.status === 'Late').length,
      half_days: monthAtts.filter((a) => a.status === 'Half Day').length,
      total_net_hours: monthAtts.reduce((s, a) => s + (a.net_hours || 0), 0),
      total_break_mins: monthAtts.reduce((s, a) => s + (a.break_duration_mins || 0), 0)
    };

    const pending_leaves = await Leave.countDocuments({ user_id: userId, status: 'Pending' });

    return res.status(200).json({
      today: formatAttendance(todayAtt),
      active_break: activeBreak,
      monthly_stats,
      pending_leaves
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

router.post('/check-in', jwtRequired('employee'), async (req, res) => {
  try {
    const userId = req.currentUser.id;
    const { now, todayStr, nowStr } = nowParts();

    let existing = await Attendance.findOne({ user_id: userId, date: todayStr });
    if (existing && existing.check_in) {
      return res.status(400).json({ error: 'You have already checked in today!' });
    }

    const [sh, sm, ss] = config.SHIFT_START_TIME.split(':').map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(sh, sm, ss, 0);
    const graceDt = new Date(shiftStart.getTime() + config.GRACE_PERIOD_MINUTES * 60000);
    const is_late = now > graceDt ? 1 : 0;
    const status = is_late ? 'Late' : 'Present';

    let attId;
    if (existing) {
      existing.check_in = nowStr;
      existing.is_late = is_late;
      existing.status = status;
      await existing.save();
      attId = existing._id.toString();
    } else {
      const created = await Attendance.create({
        user_id: userId,
        date: todayStr,
        check_in: nowStr,
        is_late,
        status
      });
      attId = created._id.toString();
    }

    return res.status(200).json({
      message: `Checked in successfully at ${formatTime12(now)}` + (is_late ? ' (Marked Late)' : ''),
      attendance_id: attId,
      is_late,
      status
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Check-in failed' });
  }
});

router.post('/check-out', jwtRequired('employee'), async (req, res) => {
  try {
    const userId = req.currentUser.id;
    const { now, todayStr, nowStr } = nowParts();

    const att = await Attendance.findOne({ user_id: userId, date: todayStr });
    if (!att || !att.check_in) {
      return res.status(400).json({ error: 'You must check in before checking out!' });
    }
    if (att.check_out) {
      return res.status(400).json({ error: 'You have already checked out today!' });
    }

    const activeBreak = await Break.findOne({ attendance_id: att._id, status: 'ongoing' });
    if (activeBreak) {
      return res.status(400).json({ error: 'Please end your active break before checking out!' });
    }

    const checkInDt = new Date(att.check_in.replace(' ', 'T') + '+05:30');
    const total_hours = Math.round(((now - checkInDt) / 3600000) * 100) / 100;
    const break_mins = att.break_duration_mins || 0;
    let net_hours = Math.round((total_hours - break_mins / 60.0) * 100) / 100;
    if (net_hours < 0) net_hours = 0.0;

    let final_status = att.status;
    if (net_hours < 4.0) final_status = 'Half Day';
    else if (att.is_late) final_status = 'Late';
    else final_status = 'Present';

    att.check_out = nowStr;
    att.total_hours = total_hours;
    att.net_hours = net_hours;
    att.status = final_status;
    await att.save();

    return res.status(200).json({
      message: `Checked out successfully at ${formatTime12(now)}`,
      total_hours,
      net_hours,
      status: final_status
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Check-out failed' });
  }
});

router.post('/break/start', jwtRequired('employee'), async (req, res) => {
  try {
    const break_type = ((req.body || {}).break_type || '').trim().toLowerCase();
    if (!['morning_tea', 'lunch', 'afternoon_tea'].includes(break_type)) {
      return res.status(400).json({ error: 'Invalid break type specified' });
    }

    const userId = req.currentUser.id;
    const { now, todayStr, nowStr } = nowParts();

    const att = await Attendance.findOne({ user_id: userId, date: todayStr });
    if (!att || !att.check_in) {
      return res.status(400).json({ error: 'You must check in before taking a break!' });
    }
    if (att.check_out) {
      return res.status(400).json({ error: 'You have already checked out for today!' });
    }

    const ongoing = await Break.findOne({ attendance_id: att._id, status: 'ongoing' });
    if (ongoing) {
      return res.status(400).json({ error: 'You already have an active break in progress!' });
    }

    await Break.create({
      attendance_id: att._id,
      user_id: userId,
      break_type,
      start_time: nowStr,
      status: 'ongoing'
    });

    const formatted_type = break_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return res.status(200).json({
      message: `${formatted_type} started at ${formatTime12(now)}`,
      break_type,
      start_time: nowStr
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to start break' });
  }
});

router.post('/break/end', jwtRequired('employee'), async (req, res) => {
  try {
    const userId = req.currentUser.id;
    const { now, todayStr, nowStr } = nowParts();

    const att = await Attendance.findOne({ user_id: userId, date: todayStr });
    if (!att) {
      return res.status(400).json({ error: 'No attendance record found for today' });
    }

    const activeBreak = await Break.findOne({
      attendance_id: att._id,
      status: 'ongoing'
    }).sort({ _id: -1 });

    if (!activeBreak) {
      return res.status(400).json({ error: 'No active break found to end' });
    }

    const startDt = new Date(activeBreak.start_time.replace(' ', 'T') + '+05:30');
    const duration_mins = Math.max(1, Math.floor((now - startDt) / 60000));

    activeBreak.end_time = nowStr;
    activeBreak.duration_mins = duration_mins;
    activeBreak.status = 'completed';
    await activeBreak.save();

    const completed = await Break.find({ attendance_id: att._id, status: 'completed' });
    const total_break_mins = completed.reduce((s, b) => s + (b.duration_mins || 0), 0);
    att.break_duration_mins = total_break_mins;
    await att.save();

    const formatted_type = activeBreak.break_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return res.status(200).json({
      message: `${formatted_type} ended. Duration: ${duration_mins} mins.`,
      duration_mins,
      total_break_mins
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to end break' });
  }
});

router.get('/history', jwtRequired('employee'), async (req, res) => {
  try {
    const userId = req.currentUser.id;
    const month = req.query.month || nowParts().todayStr.slice(0, 7);

    const rows = await Attendance.find({
      user_id: userId,
      date: { $regex: `^${month}` }
    }).sort({ date: -1 });

    const history = [];
    for (const row of rows) {
      const break_count = await Break.countDocuments({ attendance_id: row._id });
      history.push(formatAttendance(row, { break_count }));
    }

    return res.status(200).json({ history });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load history' });
  }
});

router.post('/leave/apply', jwtRequired('employee'), async (req, res) => {
  try {
    const data = req.body || {};
    const leave_type = (data.leave_type || '').trim();
    const start_date = (data.start_date || '').trim();
    const end_date = (data.end_date || '').trim();
    const reason = (data.reason || '').trim();

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        error: 'All fields (leave type, start date, end date, reason) are required'
      });
    }

    await Leave.create({
      user_id: req.currentUser.id,
      leave_type,
      start_date,
      end_date,
      reason,
      status: 'Pending'
    });

    return res.status(201).json({
      message: 'Leave application submitted successfully for Admin review.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to apply leave' });
  }
});

router.get('/leave/history', jwtRequired('employee'), async (req, res) => {
  try {
    const rows = await Leave.find({ user_id: req.currentUser.id }).sort({ _id: -1 });
    return res.status(200).json({ leaves: rows.map((r) => formatLeave(r)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load leave history' });
  }
});

router.post('/profile/update', jwtRequired(), async (req, res) => {
  try {
    const data = req.body || {};
    const name = (data.name || '').trim();
    const phone = (data.phone || '').trim();
    const current_password = (data.current_password || '').trim();
    const new_password = (data.new_password || '').trim();
    const userId = req.currentUser.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) {
      user.name = name;
      user.phone = phone;
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password required to change password' });
      }
      const ok = await bcrypt.compare(current_password, user.password_hash);
      if (!ok) {
        return res.status(400).json({ error: 'Current password does not match' });
      }
      user.password_hash = await bcrypt.hash(new_password, 10);
    }

    await user.save();
    return res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;

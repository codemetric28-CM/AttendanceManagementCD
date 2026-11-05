const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Break = require('./models/Break');
const Leave = require('./models/Leave');

async function seedDatabase() {
  // const admin_pw = await bcrypt.hash('Prathmesh@1234', 10);
  // const emp_pw = await bcrypt.hash('Emp@123', 10);

  // const users_data = [
  //   {
  //     employee_id: 'ADM001',
  //     name: 'Prathmesh',
  //     email: 'prathmesh@office.com',
  //     password_hash: admin_pw,
  //     role: 'admin',
  //     department: 'Management',
  //     designation: 'Lead Admin',
  //     phone: '9876543210',
  //     join_date: '2024-01-01'
  //   },
  //   {
  //     employee_id: 'EMP001',
  //     name: 'Sagar M ',
  //     email: 'sagar@office.com',
  //     password_hash: emp_pw,
  //     role: 'employee',
  //     department: 'General',
  //     designation: 'Python Developer',
  //     phone: '9699056940',
  //     join_date: '2026-07-13'
  //   },
   
  // ];

  for (const u of users_data) {
    const existing = await User.findOne({ employee_id: u.employee_id });
    if (existing) {
      existing.password_hash = u.password_hash;
      existing.role = u.role;
      existing.name = u.name;
      existing.email = u.email;
      await existing.save();
    } else {
      await User.create(u);
    }
  }

  const allUsers = await User.find({});
  const user_map = {};
  allUsers.forEach((u) => {
    user_map[u.employee_id] = u._id;
  });

  const today = new Date();
  const statuses = ['Present', 'Late', 'Present', 'Half Day', 'Present'];
  const pad = (n) => String(n).padStart(2, '0');

  for (const [emp_code, user_id] of Object.entries(user_map)) {
    if (emp_code === 'ADM001') continue;

    for (let idx = 5; idx >= 1; idx--) {
      const past = new Date(today);
      past.setDate(today.getDate() - idx);
      if (past.getDay() === 0 || past.getDay() === 6) continue;

      const past_date = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
      const exists = await Attendance.findOne({ user_id, date: past_date });
      if (exists) continue;

      const status = statuses[(idx + user_id.toString().charCodeAt(user_id.toString().length - 1)) % statuses.length];
      const is_late = status === 'Late' ? 1 : 0;
      const check_in_min = is_late ? 35 : 5;
      const check_in_str = `${past_date} 10:${pad(check_in_min)}:00`;
      const check_out_str =
        status !== 'Half Day' ? `${past_date} 19:00:00` : `${past_date} 14:00:00`;
      const total_hours = status !== 'Half Day' ? 9.0 : 4.0;
      const break_mins = 90;
      const net_hours = total_hours - break_mins / 60.0;

      const att = await Attendance.create({
        user_id,
        date: past_date,
        check_in: check_in_str,
        check_out: check_out_str,
        total_hours,
        break_duration_mins: break_mins,
        net_hours,
        status,
        is_late,
        notes: 'Regular Shift'
      });

      await Break.create({
        attendance_id: att._id,
        user_id,
        break_type: 'lunch',
        start_time: `${past_date} 13:00:00`,
        end_time: `${past_date} 14:00:00`,
        duration_mins: 60,
        status: 'completed'
      });
      await Break.create({
        attendance_id: att._id,
        user_id,
        break_type: 'morning_tea',
        start_time: `${past_date} 11:00:00`,
        end_time: `${past_date} 11:15:00`,
        duration_mins: 15,
        status: 'completed'
      });
      await Break.create({
        attendance_id: att._id,
        user_id,
        break_type: 'evening_tea',
        start_time: `${past_date} 17:00:00`,
        end_time: `${past_date} 17:15:00`,
        duration_mins: 15,
        status: 'completed'
      });
    }
  }

  const leaveCount = await Leave.countDocuments();
  if (leaveCount === 0 && user_map.EMP001 && user_map.EMP002) {
    const d2 = new Date(today);
    d2.setDate(today.getDate() + 2);
    const d3 = new Date(today);
    d3.setDate(today.getDate() + 3);
    const d10 = new Date(today);
    d10.setDate(today.getDate() - 10);
    const d9 = new Date(today);
    d9.setDate(today.getDate() - 9);
    const fmt = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    await Leave.create({
      user_id: user_map.EMP001,
      leave_type: 'Casual',
      start_date: fmt(d2),
      end_date: fmt(d3),
      reason: 'Family Function',
      status: 'Pending'
    });
    await Leave.create({
      user_id: user_map.EMP002,
      leave_type: 'Sick',
      start_date: fmt(d10),
      end_date: fmt(d9),
      reason: 'Viral Fever',
      status: 'Approved',
      admin_remarks: 'Get well soon'
    });
  }

  console.log('Database seeded with default Admin, Employees, Attendance & Leaves!');
}

module.exports = { seedDatabase };

if (require.main === module) {
  const mongoose = require('mongoose');
  const config = require('./config/config');
  mongoose
    .connect(config.MONGO_URI)
    .then(async () => {
      await seedDatabase();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  check_in: { type: String, default: null },
  check_out: { type: String, default: null },
  total_hours: { type: Number, default: 0.0 },
  break_duration_mins: { type: Number, default: 0 },
  net_hours: { type: Number, default: 0.0 },
  status: { type: String, default: 'Absent' },
  is_late: { type: Number, default: 0 },
  notes: { type: String, default: null }
});

attendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

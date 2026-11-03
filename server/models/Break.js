const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  attendance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  break_type: { type: String, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, default: null },
  duration_mins: { type: Number, default: 0 },
  status: { type: String, default: 'ongoing' }
});

module.exports = mongoose.model('Break', breakSchema);

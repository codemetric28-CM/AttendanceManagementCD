const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leave_type: { type: String, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  admin_remarks: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Leave', leaveSchema);

require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance',
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'jwt-attendance-secret-key-2026',
  JWT_ACCESS_TOKEN_EXPIRES: 86400, // 24 hours in seconds
  SHIFT_START_TIME: '10:00:00',
  SHIFT_END_TIME: '19:00:00',
  GRACE_PERIOD_MINUTES: 15,
  MORNING_TEA_MAX_MINS: 15,
  LUNCH_MAX_MINS: 60,
  AFTERNOON_TEA_MAX_MINS: 15
};

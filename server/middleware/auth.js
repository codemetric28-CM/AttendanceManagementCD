const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

function generateToken(userId, role, email, name) {
  return jwt.sign(
    { user_id: userId, role, email, name },
    config.JWT_SECRET_KEY,
    { expiresIn: config.JWT_ACCESS_TOKEN_EXPIRES }
  );
}

function jwtRequired(role = null) {
  return async (req, res, next) => {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token && req.cookies) {
      token = req.cookies.jwt_token;
    }

    // Support query token for file exports opened in new tab
    if (!token && req.query.jwt_token) {
      token = req.query.jwt_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    try {
      const data = jwt.verify(token, config.JWT_SECRET_KEY);
      const user = await User.findById(data.user_id).select(
        'employee_id name email role department designation phone'
      );

      if (!user) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      req.currentUser = {
        id: user._id.toString(),
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        phone: user.phone || ''
      };

      if (role && req.currentUser.role !== role && req.currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access to this resource' });
      }

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired. Please login again' });
      }
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
  };
}

function formatUser(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: (obj._id || obj.id).toString(),
    employee_id: obj.employee_id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    department: obj.department,
    designation: obj.designation,
    phone: obj.phone || '',
    join_date: obj.join_date || '',
    created_at: obj.created_at
      ? (obj.created_at instanceof Date
          ? obj.created_at.toISOString().replace('T', ' ').slice(0, 19)
          : String(obj.created_at))
      : null
  };
}

function formatAttendance(doc, extras = {}) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: (obj._id || obj.id).toString(),
    user_id: obj.user_id ? obj.user_id.toString() : null,
    date: obj.date,
    check_in: obj.check_in,
    check_out: obj.check_out,
    total_hours: obj.total_hours,
    break_duration_mins: obj.break_duration_mins,
    net_hours: obj.net_hours,
    status: obj.status,
    is_late: obj.is_late,
    notes: obj.notes,
    ...extras
  };
}

function formatBreak(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: (obj._id || obj.id).toString(),
    attendance_id: obj.attendance_id ? obj.attendance_id.toString() : null,
    user_id: obj.user_id ? obj.user_id.toString() : null,
    break_type: obj.break_type,
    start_time: obj.start_time,
    end_time: obj.end_time,
    duration_mins: obj.duration_mins,
    status: obj.status
  };
}

function formatLeave(doc, extras = {}) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: (obj._id || obj.id).toString(),
    user_id: obj.user_id ? obj.user_id.toString() : null,
    leave_type: obj.leave_type,
    start_date: obj.start_date,
    end_date: obj.end_date,
    reason: obj.reason,
    status: obj.status,
    admin_remarks: obj.admin_remarks,
    created_at: obj.created_at
      ? (obj.created_at instanceof Date
          ? obj.created_at.toISOString().replace('T', ' ').slice(0, 19)
          : String(obj.created_at))
      : null,
    ...extras
  };
}

module.exports = {
  generateToken,
  jwtRequired,
  formatUser,
  formatAttendance,
  formatBreak,
  formatLeave
};

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config/config');
const { generateToken, jwtRequired, formatUser } = require('../middleware/auth');
const { seedDatabase } = require('../seed');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const data = req.body || {};
    const email = (data.email || '').trim().toLowerCase();
    const password = (data.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      try {
        await seedDatabase();
      } catch (e) {
        console.log(`Auto-seed exception: ${e.message}`);
      }
      user = await User.findOne({ email });
    }

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id.toString(), user.role, user.email, user.name);

    res.cookie('jwt_token', token, {
      httpOnly: true,
      maxAge: config.JWT_ACCESS_TOKEN_EXPIRES * 1000
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/me', jwtRequired(), async (req, res) => {
  return res.status(200).json({ user: req.currentUser });
});

router.post('/logout', (req, res) => {
  res.clearCookie('jwt_token');
  return res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;

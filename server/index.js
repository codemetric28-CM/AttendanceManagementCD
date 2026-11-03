const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config/config');
const { seedDatabase } = require('./seed');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const adminRoutes = require('./routes/admin');
const reportsRoutes = require('./routes/reports');

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (curl, mobile apps, same-origin)
      if (!origin) return callback(null, true);
      // Allow localhost for local dev
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      // Allow all Render-hosted subdomains
      if (origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      // Allow all Vercel-hosted subdomains
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      // Allow explicitly set CLIENT_URL
      if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/export', reportsRoutes);

// Serve React build in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(clientDist, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) next();
  });
});

async function start() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('MongoDB connected');
    await seedDatabase();

    app.listen(config.PORT, () => {
      console.log(`Server running on http://127.0.0.1:${config.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

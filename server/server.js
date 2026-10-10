require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const participantRoutes = require('./routes/participants');
const attendanceRoutes = require('./routes/attendance');
const workshopRoutes = require('./routes/workshops');
const reportRoutes = require('./routes/reports');
const eventRoutes = require('./routes/event');
const databaseRoutes = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/database', databaseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Absenin API is running', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    code: 'SERVER_ERROR'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Absenin server running on port ${PORT}`);
  });
}

module.exports = app;

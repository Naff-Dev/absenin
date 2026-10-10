/**
 * Attendance Routes
 * POST /api/attendance/check-in
 * GET  /api/attendance/today
 * GET  /api/attendance/history
 */

const express = require('express');
const router = express.Router();
const appsScript = require('../services/appsScript');
const cache = require('../services/cache');
const { authMiddleware } = require('../middleware/auth');
const { getServerDate, formatDate, formatTime } = require('../utils/helpers');

// POST /api/attendance/check-in
router.post('/check-in', authMiddleware, async (req, res) => {
  try {
    const { participantId, eventId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'ID peserta wajib diisi.',
        code: 'MISSING_PARTICIPANT_ID'
      });
    }

    const now = getServerDate();
    const date = formatDate(now);
    const time = formatTime(now);

    const checkInData = {
      eventId: eventId || 'EVT001',
      participantId,
      date,
      time,
      userId: req.user.userId
    };

    const result = await appsScript.checkIn(checkInData);

    if (!result.success) {
      return res.status(result.code === 'ALREADY_CHECKED_IN' ? 409 : 400).json({
        success: false,
        message: result.message || 'Gagal melakukan check-in.',
        code: result.code || 'CHECK_IN_FAILED',
        data: result.data || null
      });
    }

    // Invalidate today's attendance cache
    cache.invalidateAttendanceToday(checkInData.eventId, date);

    // Log activity
    appsScript.addLog({
      userId: req.user.userId,
      action: 'CHECK_IN',
      participantId,
      description: `Check-in peserta berhasil`
    });

    res.json({
      success: true,
      message: 'Check-in berhasil!',
      data: {
        ...result.data,
        date,
        time,
        checkedBy: req.user.name
      }
    });
  } catch (error) {
    console.error('[Attendance] Check-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan check-in. Silakan coba lagi.',
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/attendance/today
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const eventId = req.query.eventId || 'EVT001';
    const now = getServerDate();
    const date = req.query.date || formatDate(now);

    // Check cache
    let attendance = cache.getAttendanceToday(eventId, date);

    if (!attendance) {
      const result = await appsScript.getAttendanceToday(eventId, date);
      attendance = result.data || result;
      if (Array.isArray(attendance)) {
        cache.setAttendanceToday(eventId, date, attendance);
      }
    }

    res.json({
      success: true,
      data: attendance || [],
      date,
      serverTime: formatTime(getServerDate())
    });
  } catch (error) {
    console.error('[Attendance] Today error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data kehadiran hari ini.',
      code: 'FETCH_ERROR'
    });
  }
});

// GET /api/attendance/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const params = {
      eventId: req.query.eventId || 'EVT001',
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      participantId: req.query.participantId
    };

    const result = await appsScript.getAttendanceHistory(params);

    res.json({
      success: true,
      data: result.data || result
    });
  } catch (error) {
    console.error('[Attendance] History error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat riwayat kehadiran.',
      code: 'FETCH_ERROR'
    });
  }
});

// GET /api/attendance/server-time
router.get('/server-time', authMiddleware, (req, res) => {
  const now = getServerDate();
  res.json({
    success: true,
    data: {
      date: formatDate(now),
      time: formatTime(now),
      timestamp: now.toISOString()
    }
  });
});

module.exports = router;

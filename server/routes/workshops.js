/**
 * Workshop Routes
 * GET  /api/workshops
 * POST /api/workshops/check-in
 * GET  /api/workshops/attendance
 */

const express = require('express');
const router = express.Router();
const appsScript = require('../services/appsScript');
const { authMiddleware } = require('../middleware/auth');
const { getServerDate, formatDate, formatTime } = require('../utils/helpers');

// GET /api/workshops
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await appsScript.getWorkshops();
    res.json({
      success: true,
      data: result.data || result
    });
  } catch (error) {
    console.error('[Workshops] Fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data workshop.',
      code: 'FETCH_ERROR'
    });
  }
});

// POST /api/workshops/check-in
router.post('/check-in', authMiddleware, async (req, res) => {
  try {
    const { participantId, workshopCode, eventId } = req.body;

    if (!participantId || !workshopCode) {
      return res.status(400).json({
        success: false,
        message: 'ID peserta dan kode workshop wajib diisi.',
        code: 'MISSING_FIELDS'
      });
    }

    const now = getServerDate();

    const data = {
      eventId: eventId || 'EVT001',
      participantId,
      workshopCode,
      date: formatDate(now),
      time: formatTime(now),
      userId: req.user.userId
    };

    const result = await appsScript.workshopCheckIn(data);

    if (!result.success) {
      return res.status(result.code === 'ALREADY_CHECKED_IN' ? 409 : 400).json({
        success: false,
        message: result.message || 'Gagal melakukan check-in workshop.',
        code: result.code || 'CHECK_IN_FAILED'
      });
    }

    // Log
    appsScript.addLog({
      userId: req.user.userId,
      action: 'WORKSHOP_CHECK_IN',
      participantId,
      description: `Workshop check-in: ${workshopCode}`
    });

    res.json({
      success: true,
      message: `Check-in Workshop ${workshopCode} berhasil!`,
      data: {
        ...result.data,
        date: data.date,
        time: data.time,
        checkedBy: req.user.name
      }
    });
  } catch (error) {
    console.error('[Workshops] Check-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan check-in workshop.',
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/workshops/attendance
router.get('/attendance', authMiddleware, async (req, res) => {
  try {
    const params = {
      eventId: req.query.eventId || 'EVT001',
      date: req.query.date,
      workshopCode: req.query.workshopCode
    };

    const result = await appsScript.getWorkshopAttendance(params);

    res.json({
      success: true,
      data: result.data || result
    });
  } catch (error) {
    console.error('[Workshops] Attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data absensi workshop.',
      code: 'FETCH_ERROR'
    });
  }
});

module.exports = router;

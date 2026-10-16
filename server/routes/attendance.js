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
const jwt = require('jsonwebtoken');

// SSE Connected Clients for Real-time Attendance Updates
let sseClients = [];

function broadcastRealtime(event) {
  const payload = `data: ${JSON.stringify({ ...event, timestamp: new Date().toISOString() })}\n\n`;
  sseClients = sseClients.filter(client => {
    try {
      client.res.write(payload);
      return true;
    } catch (_) {
      return false;
    }
  });
}

// GET /api/attendance/stream (Server-Sent Events for Real-time Dashboard)
router.get('/stream', (req, res) => {
  const token = (req.headers.authorization && req.headers.authorization.split(' ')[1]) || req.query.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'absenin-secret-pit-viii-papdi-2026-secure-key';
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clientObj = { id: clientId, res };
  sseClients.push(clientObj);

  // Initial connection ping
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat ping every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(':ping\n\n');
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

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

    const responseData = {
      ...result.data,
      date,
      time,
      checkedBy: req.user.name
    };

    // Broadcast real-time update to all active screens
    broadcastRealtime({
      type: 'check_in',
      eventId: checkInData.eventId,
      date,
      time,
      participantId,
      checkedBy: req.user.name,
      record: responseData
    });

    res.json({
      success: true,
      message: 'Check-in berhasil!',
      data: responseData
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

    const forceRefresh = req.query.refresh === '1' || req.query._t || req.headers['x-refresh'] === 'true';
    const dbType = (process.env.DATABASE_TYPE || 'appscript').toLowerCase().trim();
    const isLocalOrDirect = dbType === 'json' || dbType === 'supabase';

    // Check cache (bypass when json/supabase or forceRefresh is requested)
    let attendance = null;
    if (!forceRefresh && !isLocalOrDirect) {
      attendance = cache.getAttendanceToday(eventId, date);
    }

    if (!attendance) {
      const result = await appsScript.getAttendanceToday(eventId, date);
      attendance = result.data || result;
      if (Array.isArray(attendance) && !isLocalOrDirect) {
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

// DELETE /api/attendance/participant/:participantId — Batalkan absensi peserta (salah absen)
router.delete('/participant/:participantId', authMiddleware, async (req, res) => {
  try {
    const { participantId } = req.params;
    const now = getServerDate();
    const date = req.query.date || formatDate(now);
    const eventId = req.query.eventId || 'EVT001';

    const result = await appsScript.deleteAttendance(participantId, {
      byParticipant: true,
      date,
      eventId
    });

    // Invalidate cache
    cache.invalidateAttendanceToday(eventId, date);

    // Log activity
    appsScript.addLog({
      userId: req.user.userId,
      action: 'CANCEL_CHECK_IN',
      participantId,
      description: `Absensi peserta dibatalkan (salah absen) pada tanggal ${date}`
    });

    broadcastRealtime({
      type: 'cancel_check_in',
      eventId,
      date,
      participantId
    });

    res.json({
      success: true,
      message: 'Absensi peserta berhasil dibatalkan. Status kembali menjadi Belum Hadir.',
      data: result
    });
  } catch (error) {
    console.error('[Attendance] Cancel check-in error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal membatalkan absensi peserta.',
      code: 'SERVER_ERROR'
    });
  }
});

// DELETE /api/attendance/:id — Hapus absensi by attendance_id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const now = getServerDate();
    const date = req.query.date || formatDate(now);
    const eventId = req.query.eventId || 'EVT001';

    const result = await appsScript.deleteAttendance(id);

    cache.invalidateAttendanceToday(eventId, date);

    appsScript.addLog({
      userId: req.user.userId,
      action: 'DELETE_ATTENDANCE',
      description: `Record absensi ${id} dihapus`
    });

    broadcastRealtime({
      type: 'delete_attendance',
      eventId,
      date,
      attendanceId: id
    });

    res.json({
      success: true,
      message: 'Catatan absensi berhasil dihapus.',
      data: result
    });
  } catch (error) {
    console.error('[Attendance] Delete attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus catatan absensi.',
      code: 'SERVER_ERROR'
    });
  }
});

// PUT /api/attendance/:id — Edit detail record absensi
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { time, date, status } = req.body;
    const eventId = req.body.eventId || 'EVT001';

    const updateData = {};
    if (time !== undefined) updateData.time = time;
    if (date !== undefined) updateData.date = date;
    if (status !== undefined) updateData.status = status;
    updateData.userId = req.user.userId;

    const result = await appsScript.updateAttendance(id, updateData);

    const now = getServerDate();
    const targetDate = date || formatDate(now);
    cache.invalidateAttendanceToday(eventId, targetDate);

    appsScript.addLog({
      userId: req.user.userId,
      action: 'EDIT_ATTENDANCE',
      description: `Record absensi ${id} diubah: ${time || ''} ${date || ''}`
    });

    broadcastRealtime({
      type: 'update_attendance',
      eventId,
      date: targetDate,
      attendanceId: id
    });

    res.json({
      success: true,
      message: 'Data absensi berhasil diperbarui.',
      data: result.data || result
    });
  } catch (error) {
    console.error('[Attendance] Update attendance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui catatan absensi.',
      code: 'SERVER_ERROR'
    });
  }
});

router.broadcastRealtime = broadcastRealtime;
module.exports = router;

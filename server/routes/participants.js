/**
 * Participant Routes
 * GET  /api/participants
 * GET  /api/participants/:id
 * POST /api/participants
 */

const express = require('express');
const router = express.Router();
const appsScript = require('../services/appsScript');
const cache = require('../services/cache');
const { authMiddleware } = require('../middleware/auth');
const { getServerDate, formatDate, formatTime } = require('../utils/helpers');

// GET /api/participants — with caching
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Check cache first
    let participants = cache.getParticipants();

    if (!participants) {
      const result = await appsScript.getParticipants();
      participants = result.data || result;
      if (Array.isArray(participants)) {
        cache.setParticipants(participants);
      }
    }

    res.json({
      success: true,
      data: participants || [],
      cached: !!cache.getParticipants()
    });
  } catch (error) {
    console.error('[Participants] Fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data peserta.',
      code: 'FETCH_ERROR'
    });
  }
});

// GET /api/participants/refresh — force refresh cache
router.get('/refresh', authMiddleware, async (req, res) => {
  try {
    cache.invalidateParticipants();
    const result = await appsScript.getParticipants();
    const participants = result.data || result;
    if (Array.isArray(participants)) {
      cache.setParticipants(participants);
    }

    res.json({
      success: true,
      message: 'Data peserta berhasil diperbarui.',
      data: participants || [],
      count: (participants || []).length
    });
  } catch (error) {
    console.error('[Participants] Refresh error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data peserta.',
      code: 'FETCH_ERROR'
    });
  }
});

// GET /api/participants/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = cache.getParticipants();
    if (cached) {
      const found = cached.find(p => p.ID === id);
      if (found) {
        return res.json({ success: true, data: found });
      }
    }

    const result = await appsScript.getParticipantById(id);
    res.json({
      success: true,
      data: result.data || result
    });
  } catch (error) {
    console.error('[Participants] Get by ID error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data peserta.',
      code: 'FETCH_ERROR'
    });
  }
});

// POST /api/participants
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, institution, email, product, sympo, workshopA, workshopB, workshopC, note, checkInNow } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama peserta wajib diisi.',
        code: 'MISSING_NAME'
      });
    }

    const participantData = {
      name: name.trim(),
      phone: (phone || '').trim(),
      institution: (institution || '').trim(),
      email: (email || '').trim(),
      product: (product || '').trim(),
      sympo: sympo ? 1 : 0,
      workshopA: workshopA ? 1 : 0,
      workshopB: workshopB ? 1 : 0,
      workshopC: workshopC ? 1 : 0,
      note: (note || '').trim(),
      source: 'MANUAL'
    };

    const result = await appsScript.addParticipant(participantData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Gagal menambahkan peserta.',
        code: result.code || 'ADD_FAILED'
      });
    }

    const newParticipant = result.data;

    // Update cache
    if (newParticipant) {
      cache.addParticipantToCache(newParticipant);
    }

    // Log
    appsScript.addLog({
      userId: req.user.userId,
      action: 'ADD_PARTICIPANT',
      participantId: newParticipant?.ID,
      description: `Peserta ditambahkan: ${name}`
    });

    // If checkInNow, also create attendance
    let attendanceResult = null;
    if (checkInNow && newParticipant) {
      const now = getServerDate();
      const checkInData = {
        eventId: req.body.eventId || 'EVT001',
        participantId: newParticipant.ID,
        date: formatDate(now),
        time: formatTime(now),
        userId: req.user.userId
      };

      try {
        attendanceResult = await appsScript.checkIn(checkInData);
        cache.invalidateAttendanceToday(checkInData.eventId, checkInData.date);

        appsScript.addLog({
          userId: req.user.userId,
          action: 'CHECK_IN',
          participantId: newParticipant.ID,
          description: `Check-in peserta baru: ${name}`
        });
      } catch (err) {
        console.error('[Participants] Auto check-in failed:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: checkInNow
        ? 'Peserta berhasil ditambahkan dan kehadiran dicatat.'
        : 'Peserta berhasil ditambahkan.',
      data: {
        participant: newParticipant,
        attendance: attendanceResult?.data || null
      }
    });
  } catch (error) {
    console.error('[Participants] Add error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan peserta. Silakan coba lagi.',
      code: 'SERVER_ERROR'
    });
  }
});

// PUT /api/participants/:id — Edit detail peserta
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, institution, email, product, sympo, workshopA, workshopB, workshopC, note, no } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama peserta tidak boleh kosong.',
        code: 'INVALID_NAME'
      });
    }

    const participantData = {};
    if (name !== undefined) participantData.name = name.trim();
    if (phone !== undefined) participantData.phone = (phone || '').trim();
    if (institution !== undefined) participantData.institution = (institution || '').trim();
    if (email !== undefined) participantData.email = (email || '').trim();
    if (product !== undefined) participantData.product = (product || '').trim();
    if (note !== undefined) participantData.note = (note || '').trim();
    if (no !== undefined && no !== null && no !== '') participantData.no = Number(no);
    if (sympo !== undefined) participantData.sympo = sympo ? 1 : 0;
    if (workshopA !== undefined) participantData.workshopA = workshopA ? 1 : 0;
    if (workshopB !== undefined) participantData.workshopB = workshopB ? 1 : 0;
    if (workshopC !== undefined) participantData.workshopC = workshopC ? 1 : 0;

    const result = await appsScript.updateParticipant(id, participantData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Gagal memperbarui data peserta.',
        code: result.code || 'UPDATE_FAILED'
      });
    }

    const updated = result.data;

    // Update memory cache
    cache.updateParticipantInCache(updated);
    cache.invalidateParticipants();

    // Log activity
    appsScript.addLog({
      userId: req.user.userId,
      action: 'EDIT_PARTICIPANT',
      participantId: id,
      description: `Data peserta diperbarui: ${updated.NAME || id}`
    });

    res.json({
      success: true,
      message: 'Data peserta berhasil diperbarui.',
      data: updated
    });
  } catch (error) {
    console.error('[Participants] Update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data peserta. Silakan coba lagi.',
      code: 'SERVER_ERROR'
    });
  }
});

// DELETE /api/participants/:id — Hapus peserta & absensinya
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID peserta wajib disertakan.',
        code: 'INVALID_ID'
      });
    }

    const result = await appsScript.deleteParticipant(id);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || 'Peserta tidak ditemukan.',
        code: result.code || 'NOT_FOUND'
      });
    }

    // Invalidate caches
    cache.removeParticipantFromCache(id);
    cache.invalidateParticipants();
    cache.clearAll();

    // Log activity
    appsScript.addLog({
      userId: req.user.userId,
      action: 'DELETE_PARTICIPANT',
      participantId: id,
      description: `Peserta dihapus: ${id}`
    });

    res.json({
      success: true,
      message: 'Peserta berhasil dihapus.',
      data: result.data || { id }
    });
  } catch (error) {
    console.error('[Participants] Delete error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus peserta. Silakan coba lagi.',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;

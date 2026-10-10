/**
 * Event Routes
 * GET  /api/event
 * POST /api/event/init
 */

const express = require('express');
const router = express.Router();
const appsScript = require('../services/appsScript');
const { authMiddleware } = require('../middleware/auth');

// GET /api/event
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await appsScript.getEvent();
    res.json({
      success: true,
      data: result.data || result
    });
  } catch (error) {
    console.error('[Event] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data event.',
      code: 'FETCH_ERROR'
    });
  }
});

// POST /api/event/init — Initialize spreadsheet sheets and headers
router.post('/init', authMiddleware, async (req, res) => {
  try {
    const result = await appsScript.initSpreadsheet();
    res.json(result);
  } catch (error) {
    console.error('[Event Init] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan inisialisasi spreadsheet.',
      code: 'INIT_ERROR'
    });
  }
});

module.exports = router;

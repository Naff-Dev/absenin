/**
 * Database Management & Sync Routes
 * GET  /api/database/status — Status provider aktif & kelengkapan konfigurasi
 * POST /api/database/sync   — Trigger sinkronisasi antar database (Admin)
 */

const express = require('express');
const router = express.Router();
const db = require('../../database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/database/status
router.get('/status', (req, res) => {
  const activeType = db.getDatabaseType();
  const jsonProvider = db.getProvider('json');
  const appscriptProvider = db.getProvider('appscript');
  const supabaseProvider = db.getProvider('supabase');

  res.json({
    success: true,
    activeProvider: activeType,
    providers: {
      json: {
        supported: true,
        configured: true,
        path: process.env.JSON_DB_PATH || './data/db.json'
      },
      appscript: {
        supported: true,
        configured: appscriptProvider.isConfigured ? appscriptProvider.isConfigured() : false,
        urlSet: Boolean(process.env.APPSCRIPT_URL || process.env.APPS_SCRIPT_URL)
      },
      supabase: {
        supported: true,
        configured: supabaseProvider.isConfigured ? supabaseProvider.isConfigured() : false,
        urlSet: Boolean(process.env.SUPABASE_URL)
      }
    }
  });
});

// POST /api/database/sync
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { source, target, merge } = req.body;

    if (!source || !target) {
      return res.status(400).json({
        success: false,
        message: 'Source dan target provider wajib diisi. Contoh: { "source": "appscript", "target": "json" }',
        code: 'MISSING_PARAMS'
      });
    }

    const result = await db.sync(source, target, { merge: merge !== false });

    // Catat log sinkronisasi
    db.addLog({
      userId: req.user.userId,
      action: 'DATABASE_SYNC',
      description: `Sinkronisasi database dari ${source.toUpperCase()} ke ${target.toUpperCase()}`
    });

    res.json(result);
  } catch (error) {
    console.error('[Database Sync Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal melakukan sinkronisasi database.',
      code: 'SYNC_ERROR'
    });
  }
});

module.exports = router;

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

// Helper: Cek apakah user adalah Super Admin
function requireAdmin(req, res, next) {
  const isAdmin = req.user && (
    req.user.username === 'admin' ||
    (req.user.name && req.user.name.toLowerCase().includes('admin'))
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Super Admin.',
      code: 'FORBIDDEN'
    });
  }
  next();
}

// POST /api/database/clean — Bersihkan seluruh data absensi (Super Admin Only)
router.post('/clean', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.cleanAttendanceData();

    // Flush cache
    const cache = require('../services/cache');
    cache.clearAll();

    // Log admin action
    db.addLog({
      userId: req.user.userId,
      action: 'CLEAN_DATABASE',
      description: `Seluruh data absensi dibersihkan oleh Super Admin (${req.user.name})`
    });

    // Broadcast realtime event ke seluruh screen yang terhubung
    const attendanceRoute = require('./attendance');
    if (typeof attendanceRoute.broadcastRealtime === 'function') {
      attendanceRoute.broadcastRealtime({
        type: 'database_cleaned',
        cleanedBy: req.user.name
      });
    }

    res.json({
      success: true,
      message: 'Database absensi berhasil dibersihkan! Status absensi kembali ke awal (0 kehadiran). Seluruh data peserta tetap aman.',
      data: result
    });
  } catch (error) {
    console.error('[Clean DB Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal membersihkan database.',
      code: 'CLEAN_ERROR'
    });
  }
});

// POST /api/database/sync — Trigger sinkronisasi antar database (Super Admin Only)
router.post('/sync', authMiddleware, requireAdmin, async (req, res) => {
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

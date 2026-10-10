/**
 * Auth Routes
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

const express = require('express');
const router = express.Router();
const appsScript = require('../services/appsScript');
const { authMiddleware, generateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi.',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const result = await appsScript.validateLogin(username, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message || 'Username atau password salah.',
        code: result.code || 'INVALID_CREDENTIALS'
      });
    }

    const user = result.data;

    if (user.STATUS !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Akun tidak aktif. Hubungi administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    const token = generateToken(user);

    // Log login activity
    appsScript.addLog({
      userId: user.USER_ID,
      action: 'LOGIN',
      description: `Login berhasil: ${user.NAME}`
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          userId: user.USER_ID,
          name: user.NAME,
          username: user.USERNAME
        }
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal login. Silakan coba lagi.',
      code: 'SERVER_ERROR'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    appsScript.addLog({
      userId: req.user.userId,
      action: 'LOGOUT',
      description: `Logout: ${req.user.name}`
    });

    res.json({ success: true, message: 'Logout berhasil' });
  } catch (error) {
    res.json({ success: true, message: 'Logout berhasil' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      name: req.user.name,
      username: req.user.username
    }
  });
});

module.exports = router;

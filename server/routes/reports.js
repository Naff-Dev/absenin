/**
 * Report Routes
 * GET  /api/reports
 * GET  /api/reports/export
 */

const express = require('express');
const router = express.Router();
const appsScript = require('../services/appsScript');
const { authMiddleware } = require('../middleware/auth');
const { getServerDate, formatDate } = require('../utils/helpers');
const XLSX = require('xlsx');

// GET /api/reports
router.get('/', authMiddleware, async (req, res) => {
  try {
    const params = {
      eventId: req.query.eventId || 'EVT001',
      type: req.query.type || 'daily',
      date: req.query.date,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      workshopCode: req.query.workshopCode,
      name: req.query.name,
      institution: req.query.institution,
      product: req.query.product,
      sympo: req.query.sympo,
      userId: req.query.userId
    };

    const result = await appsScript.getReportData(params);

    res.json({
      success: true,
      data: result.data || result
    });
  } catch (error) {
    console.error('[Reports] Fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data laporan.',
      code: 'FETCH_ERROR'
    });
  }
});

// GET /api/reports/export
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const params = {
      eventId: req.query.eventId || 'EVT001',
      type: req.query.type || 'all'
    };

    const result = await appsScript.getReportData({ ...params, type: 'export' });
    const data = result.data || result;

    // Build workbook
    const wb = XLSX.utils.book_new();

    // SUMMARY sheet
    if (data.summary) {
      const summaryData = [
        ['Laporan Absensi'],
        ['Event', data.summary.eventName || 'PIT VIII PAPDI Purwokerto 2026'],
        ['Tanggal Export', formatDate(getServerDate())],
        [''],
        ['Total Peserta', data.summary.totalParticipants || 0],
        ['Total Hadir', data.summary.totalAttendance || 0]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'SUMMARY');
    }

    // PESERTA sheet
    if (data.participants && data.participants.length > 0) {
      const wsParticipants = XLSX.utils.json_to_sheet(data.participants);
      XLSX.utils.book_append_sheet(wb, wsParticipants, 'PESERTA');
    }

    // ABSENSI sheet (Absensi Tunggal)
    if (data.attendance && data.attendance.length > 0) {
      const wsAttendance = XLSX.utils.json_to_sheet(data.attendance);
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'ABSENSI');
    }

    // REKAP sheet
    if (data.recap && data.recap.length > 0) {
      const wsRecap = XLSX.utils.json_to_sheet(data.recap);
      XLSX.utils.book_append_sheet(wb, wsRecap, 'REKAP');
    }

    // PANITIA sheet
    if (data.panitia && data.panitia.length > 0) {
      // Remove password from export
      const safePanitia = data.panitia.map(p => ({
        USER_ID: p.USER_ID,
        NAME: p.NAME,
        USERNAME: p.USERNAME,
        STATUS: p.STATUS
      }));
      const wsPanitia = XLSX.utils.json_to_sheet(safePanitia);
      XLSX.utils.book_append_sheet(wb, wsPanitia, 'PANITIA');
    }

    // LOG sheet
    if (data.logs && data.logs.length > 0) {
      const wsLog = XLSX.utils.json_to_sheet(data.logs);
      XLSX.utils.book_append_sheet(wb, wsLog, 'LOG');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Log activity
    appsScript.addLog({
      userId: req.user.userId,
      action: 'EXPORT_REPORT',
      description: 'Export laporan Excel'
    });

    const filename = `Absenin_PIT_VIII_PAPDI_2026.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('[Reports] Export error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal mengexport laporan.',
      code: 'EXPORT_ERROR'
    });
  }
});

module.exports = router;

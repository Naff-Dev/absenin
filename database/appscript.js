/**
 * Google Apps Script Database Provider
 * Handles communication with Google Apps Script Web App (connected to Google Sheets).
 * Automatically falls back to JSON provider in local development if URL is not configured.
 */

const jsonProvider = require('./json');

function getAppsScriptUrl() {
  return process.env.APPSCRIPT_URL || process.env.APPS_SCRIPT_URL || '';
}

function isConfigured() {
  const url = getAppsScriptUrl();
  return Boolean(
    url &&
    !url.includes('YOUR_DEPLOYMENT_ID') &&
    process.env.USE_MOCK !== 'true'
  );
}

async function callAppsScript(action, params = {}) {
  const scriptUrl = getAppsScriptUrl();
  if (!isConfigured()) {
    throw new Error('APPSCRIPT_URL is not configured');
  }

  const url = new URL(scriptUrl);
  url.searchParams.set('action', action);

  const writeActions = ['addParticipant', 'checkIn', 'workshopCheckIn', 'addLog', 'importParticipants', 'setupWorkshops'];
  const isWrite = writeActions.includes(action);

  try {
    let response;
    if (isWrite) {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        redirect: 'follow'
      });
    } else {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
      response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow'
      });
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[AppsScript] Invalid JSON response:', text.substring(0, 200));
      throw new Error('Respons server tidak valid');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    if (error.message === 'Respons server tidak valid') throw error;
    console.error(`[AppsScript] Error calling ${action}:`, error.message);
    throw new Error('Gagal menghubungi Google Apps Script. Silakan periksa koneksi atau deployment.');
  }
}

// --- Event ---
async function getEvent() {
  if (!isConfigured()) return jsonProvider.getEvent();
  return callAppsScript('getEvent');
}

// --- Participants ---
async function getParticipants() {
  if (!isConfigured()) return jsonProvider.getParticipants();
  return callAppsScript('getParticipants');
}

async function getParticipantById(id) {
  if (!isConfigured()) return jsonProvider.getParticipantById(id);
  return callAppsScript('getParticipant', { id });
}

async function addParticipant(data) {
  if (!isConfigured()) return jsonProvider.addParticipant(data);
  return callAppsScript('addParticipant', data);
}

// --- Attendance ---
async function checkIn(data) {
  if (!isConfigured()) return jsonProvider.checkIn(data);
  return callAppsScript('checkIn', data);
}

async function getAttendanceToday(eventId, date) {
  if (!isConfigured()) return jsonProvider.getAttendanceToday(eventId, date);
  return callAppsScript('getAttendanceToday', { eventId, date });
}

async function getAttendanceHistory(params = {}) {
  if (!isConfigured()) return jsonProvider.getAttendanceHistory(params);
  return callAppsScript('getAttendanceHistory', params);
}

// --- Workshop ---
async function getWorkshops() {
  if (!isConfigured()) return jsonProvider.getWorkshops();
  return callAppsScript('getWorkshops');
}

async function workshopCheckIn(data) {
  if (!isConfigured()) return jsonProvider.workshopCheckIn(data);
  return callAppsScript('workshopCheckIn', data);
}

async function getWorkshopAttendance(params = {}) {
  if (!isConfigured()) return jsonProvider.getWorkshopAttendance(params);
  return callAppsScript('getWorkshopAttendance', params);
}

// --- Auth ---
async function validateLogin(username, password) {
  if (!isConfigured()) return jsonProvider.validateLogin(username, password);
  return callAppsScript('validateLogin', { username, password });
}

// --- Reports ---
async function getReportData(params = {}) {
  if (!isConfigured()) return jsonProvider.getReportData(params);
  return callAppsScript('getReportData', params);
}

// --- Log ---
async function addLog(data) {
  if (!isConfigured()) return jsonProvider.addLog(data);
  try {
    return await callAppsScript('addLog', data);
  } catch (error) {
    console.error('[AppsScript] Log write failed:', error.message);
    return { success: false };
  }
}

// --- Init ---
async function init() {
  if (!isConfigured()) return jsonProvider.init();
  return callAppsScript('init');
}

async function initSpreadsheet() {
  return init();
}

/**
 * Dump all data from Google Apps Script for synchronization
 */
async function getAllData() {
  if (!isConfigured()) return jsonProvider.getAllData();
  const reportRes = await callAppsScript('getReportData', { type: 'export' });
  const eventRes = await callAppsScript('getEvent');
  const workshopsRes = await callAppsScript('getWorkshops');

  const reportData = reportRes.data || {};
  return {
    events: eventRes.data ? [eventRes.data] : [],
    panitia: reportData.panitia || [],
    workshops: workshopsRes.data || [],
    participants: reportData.participants || [],
    attendance: reportData.attendance || [],
    workshopAttendance: reportData.workshopAttendance || [],
    logs: reportData.logs || []
  };
}

/**
 * Bulk import into Google Apps Script
 */
async function importAllData(data = {}) {
  if (!isConfigured()) return jsonProvider.importAllData(data);

  if (Array.isArray(data.participants) && data.participants.length > 0) {
    await callAppsScript('importParticipants', {
      clearExisting: false,
      participants: data.participants
    });
  }

  return { success: true };
}

async function updateParticipant(id, data) {
  if (isConfigured()) {
    try {
      return await callAppsScript('updateParticipant', { id, ...data });
    } catch (_) {}
  }
  return jsonProvider.updateParticipant(id, data);
}

async function deleteAttendance(identifier, options = {}) {
  if (isConfigured()) {
    try {
      return await callAppsScript('deleteAttendance', { identifier, ...options });
    } catch (_) {}
  }
  return jsonProvider.deleteAttendance(identifier, options);
}

async function updateAttendance(attendanceId, data) {
  if (isConfigured()) {
    try {
      return await callAppsScript('updateAttendance', { attendanceId, ...data });
    } catch (_) {}
  }
  return jsonProvider.updateAttendance(attendanceId, data);
}

async function deleteParticipant(id) {
  if (isConfigured()) {
    try {
      return await callAppsScript('deleteParticipant', { id });
    } catch (_) {}
  }
  return jsonProvider.deleteParticipant(id);
}

module.exports = {
  providerName: 'appscript',
  isConfigured,
  init,
  initSpreadsheet,
  getEvent,
  getParticipants,
  getParticipantById,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  checkIn,
  getAttendanceToday,
  getAttendanceHistory,
  deleteAttendance,
  updateAttendance,
  getWorkshops,
  workshopCheckIn,
  getWorkshopAttendance,
  validateLogin,
  getReportData,
  addLog,
  getAllData,
  importAllData
};

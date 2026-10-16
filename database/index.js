/**
 * Absenin Database Unified Adapter / Manager
 * Selects and exposes the database provider based on process.env.DATABASE_TYPE
 *
 * Supported DATABASE_TYPE values:
 * - 'appscript' (Default) -> Google Apps Script Web App (connected to Google Sheets)
 * - 'json'               -> JSON Local database stored at JSON_DB_PATH (data/db.json)
 * - 'supabase'           -> Supabase (PostgreSQL) using SUPABASE_URL and SUPABASE_ANON_KEY
 */

require('dotenv').config();

const jsonProvider = require('./json');
const appscriptProvider = require('./appscript');
const supabaseProvider = require('./supabase');
const { syncDatabases } = require('./sync');

/**
 * Get normalized database type from environment variables
 */
function getDatabaseType() {
  const envType = (process.env.DATABASE_TYPE || 'appscript').toLowerCase().trim();
  if (envType === 'supabase') return 'supabase';
  if (envType === 'json') return 'json';
  return 'appscript';
}

/**
 * Get database provider instance by name
 */
function getProvider(type) {
  const normalized = (type || getDatabaseType()).toLowerCase().trim();
  switch (normalized) {
    case 'supabase':
      return supabaseProvider;
    case 'json':
      return jsonProvider;
    case 'appscript':
    case 'apps_script':
    default:
      return appscriptProvider;
  }
}

/**
 * Get currently active provider
 */
function getActiveProvider() {
  return getProvider(getDatabaseType());
}

// Log active database provider at boot
const currentType = getDatabaseType();
console.log(`[Database] Adapter aktif: ${currentType.toUpperCase()} (DATABASE_TYPE=${process.env.DATABASE_TYPE || 'appscript [default]'})`);

// --- Proxy Unified Interface to Active Provider ---

const db = {
  getDatabaseType,
  getProvider,
  getActiveProvider,

  // Synchronization
  sync: async (sourceType, targetType, options) => {
    const src = getProvider(sourceType);
    const tgt = getProvider(targetType);
    return syncDatabases(src, tgt, options);
  },

  // Event
  getEvent: (...args) => getActiveProvider().getEvent(...args),
  init: (...args) => getActiveProvider().init(...args),
  initSpreadsheet: (...args) => getActiveProvider().initSpreadsheet(...args),

  // Participants
  getParticipants: (...args) => getActiveProvider().getParticipants(...args),
  getParticipantById: (...args) => getActiveProvider().getParticipantById(...args),
  addParticipant: (...args) => getActiveProvider().addParticipant(...args),
  updateParticipant: (...args) => getActiveProvider().updateParticipant(...args),
  deleteParticipant: (...args) => getActiveProvider().deleteParticipant(...args),

  // Auth / Panitia
  validateLogin: (...args) => getActiveProvider().validateLogin(...args),

  // Attendance (Single unified attendance)
  checkIn: (...args) => getActiveProvider().checkIn(...args),
  getAttendanceToday: (...args) => getActiveProvider().getAttendanceToday(...args),
  getAttendanceHistory: (...args) => getActiveProvider().getAttendanceHistory(...args),
  deleteAttendance: (...args) => getActiveProvider().deleteAttendance(...args),
  updateAttendance: (...args) => getActiveProvider().updateAttendance(...args),

  // Workshops
  getWorkshops: (...args) => getActiveProvider().getWorkshops(...args),
  workshopCheckIn: (...args) => (getActiveProvider().workshopCheckIn ? getActiveProvider().workshopCheckIn(...args) : Promise.resolve({ success: true })),
  getWorkshopAttendance: (...args) => (getActiveProvider().getWorkshopAttendance ? getActiveProvider().getWorkshopAttendance(...args) : Promise.resolve({ success: true, data: [] })),

  // Reports
  getReportData: (...args) => getActiveProvider().getReportData(...args),

  // Logging
  addLog: (...args) => getActiveProvider().addLog(...args),

  // Raw data dump / import
  getAllData: (...args) => getActiveProvider().getAllData(...args),
  importAllData: (...args) => getActiveProvider().importAllData(...args),

  // Utilities
  isConfigured: () => {
    const p = getActiveProvider();
    return typeof p.isConfigured === 'function' ? p.isConfigured() : true;
  },
  resetData: () => {
    const p = getActiveProvider();
    if (typeof p.resetData === 'function') return p.resetData();
  },
  cleanAttendanceData: (...args) => {
    const p = getActiveProvider();
    if (typeof p.cleanAttendanceData === 'function') return p.cleanAttendanceData(...args);
    if (typeof p.resetData === 'function') return p.resetData(...args);
    return Promise.resolve({ success: true, message: 'Reset selesai.' });
  }
};

module.exports = db;

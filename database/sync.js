/**
 * Database Synchronization Module
 * Allows two-way synchronization between any pair of providers:
 * - JSON Local <-> Google Apps Script
 * - JSON Local <-> Supabase
 * - Google Apps Script <-> Supabase
 */

async function syncDatabases(sourceProvider, targetProvider, options = { merge: true }) {
  if (!sourceProvider || !targetProvider) {
    throw new Error('Source dan target provider wajib ditentukan untuk sinkronisasi.');
  }

  const sourceName = sourceProvider.providerName || 'unknown';
  const targetName = targetProvider.providerName || 'unknown';

  console.log(`[Database Sync] Memulai sinkronisasi dari [${sourceName}] ke [${targetName}]...`);

  // 1. Ekstrak seluruh data dari source provider
  if (typeof sourceProvider.getAllData !== 'function') {
    throw new Error(`Provider ${sourceName} tidak mendukung fungsi getAllData()`);
  }

  const sourceData = await sourceProvider.getAllData();

  const counts = {
    events: (sourceData.events || []).length,
    panitia: (sourceData.panitia || []).length,
    workshops: (sourceData.workshops || []).length,
    participants: (sourceData.participants || []).length,
    attendance: (sourceData.attendance || []).length,
    workshopAttendance: (sourceData.workshopAttendance || []).length,
    logs: (sourceData.logs || []).length
  };

  console.log(`[Database Sync] Data diekstrak: ${counts.participants} peserta, ${counts.attendance} absensi, ${counts.workshopAttendance} absensi workshop.`);

  // 2. Import ke target provider
  if (typeof targetProvider.importAllData !== 'function') {
    throw new Error(`Provider ${targetName} tidak mendukung fungsi importAllData()`);
  }

  const importResult = await targetProvider.importAllData(sourceData, options);

  console.log(`[Database Sync] Sinkronisasi dari [${sourceName}] ke [${targetName}] berhasil diselesaikan!`);

  return {
    success: true,
    source: sourceName,
    target: targetName,
    syncedAt: new Date().toISOString(),
    counts,
    details: importResult
  };
}

module.exports = {
  syncDatabases
};

/**
 * Absenin — Automated Acceptance & Integration Test Suite
 * Tests all flows from AGENT.md Sections 60 & 61:
 * - Authentication (valid, invalid, inactive)
 * - Participant search, load, detail, add, duplicate warning
 * - Check-in & duplicate check-in prevention
 * - Workshop check-in & duplicate check-in prevention
 * - Attendance history & today's attendance
 * - Reports & Excel export
 * - Core 18-step acceptance test flow
 */

const assert = require('assert');
const appsScript = require('../server/services/appsScript');
const mockData = require('../server/services/mockData');
const { generateToken } = require('../server/middleware/auth');
const helpers = require('../server/utils/helpers');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../data/db.json');
let originalDbBackup = null;
if (fs.existsSync(DB_PATH)) {
  originalDbBackup = fs.readFileSync(DB_PATH, 'utf8');
}

let testPassed = 0;
let testFailed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    testPassed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    testFailed++;
  }
}

async function itAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    testPassed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    testFailed++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING ABSENIN TEST SUITE (AGENT.md Sec 60 & 61) ===\n');

  // Reset mock data before starting
  mockData.resetData();
  if (typeof appsScript.resetData === 'function') appsScript.resetData();

  console.log('--- 0. Spreadsheet Initialization Tests ---');

  await itAsync('Spreadsheet init creates and verifies all 7 required sheets', async () => {
    const res = await appsScript.initSpreadsheet();
    assert.strictEqual(res.success, true);
    assert.ok(res.details.length >= 7, 'Should initialize all 7 sheets');
  });

  console.log('--- 1. Authentication Tests ---');

  await itAsync('Valid login succeeds with active user', async () => {
    const res = await appsScript.validateLogin('admin', 'password123');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.USERNAME, 'admin');
    assert.strictEqual(res.data.STATUS, 'ACTIVE');

    const token = generateToken(res.data);
    assert.ok(token, 'JWT token should be generated');
  });

  await itAsync('Invalid password fails with INVALID_CREDENTIALS', async () => {
    const res = await appsScript.validateLogin('admin', 'wrongpass');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'INVALID_CREDENTIALS');
  });

  await itAsync('Inactive account fails with ACCOUNT_INACTIVE', async () => {
    const res = await appsScript.validateLogin('nonaktif', 'password123');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'ACCOUNT_INACTIVE');
  });

  console.log('\n--- 2. Event & Participant Tests ---');

  await itAsync('Get active event data', async () => {
    const res = await appsScript.getEvent();
    assert.strictEqual(res.success, true);
    assert.ok(res.data.EVENT_NAME.includes('PIT VIII PAPDI'));
    assert.strictEqual(res.data.STATUS, 'ACTIVE');
  });

  await itAsync('Load initial participants list', async () => {
    const res = await appsScript.getParticipants();
    assert.strictEqual(res.success, true);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length >= 3);
  });

  await itAsync('Get participant by ID', async () => {
    const res = await appsScript.getParticipantById('P001');
    assert.strictEqual(res.success, true);
    assert.ok(res.data.NAME.toLowerCase().includes('leo'));
  });

  await itAsync('Search participant by name finds Leo', async () => {
    const res = await appsScript.getParticipants();
    const matches = res.data.filter(p => p.NAME.toLowerCase().includes('leo'));
    assert.ok(matches.length >= 1, 'Should find at least 1 participant matching Leo');
    assert.strictEqual(matches[0].ID, 'P001');
  });

  await itAsync('Add new participant with auto-generated ID', async () => {
    const res = await appsScript.addParticipant({
      name: 'dr. Hendra Kusuma, Sp.PD',
      phone: '081555666777',
      institution: 'RSUD Banyumas',
      email: 'hendra@example.com',
      product: 'Simposium Only',
      sympo: 1,
      workshopA: 0,
      workshopB: 0,
      workshopC: 0
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.NAME, 'dr. Hendra Kusuma, Sp.PD');
    assert.ok(res.data.ID.startsWith('P'));
  });

  console.log('\n--- 3. Attendance & Duplicate Prevention Tests ---');

  const today = helpers.formatDate(helpers.getServerDate());
  const nowTime = helpers.formatTime(helpers.getServerDate());

  await itAsync('Check-in participant Leo (P001) succeeds', async () => {
    const res = await appsScript.checkIn({
      eventId: 'EVT001',
      participantId: 'P001',
      date: today,
      time: nowTime,
      userId: 'USR001'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.STATUS, 'HADIR');
    assert.strictEqual(res.data.PARTICIPANT_ID, 'P001');
  });

  await itAsync('Duplicate check-in on the same day is rejected', async () => {
    const res = await appsScript.checkIn({
      eventId: 'EVT001',
      participantId: 'P001',
      date: today,
      time: nowTime,
      userId: 'USR001'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'ALREADY_CHECKED_IN');
  });

  await itAsync('Get attendance today reflects check-in', async () => {
    const res = await appsScript.getAttendanceToday('EVT001', today);
    assert.strictEqual(res.success, true);
    const found = res.data.find(a => a.PARTICIPANT_ID === 'P001');
    assert.ok(found, 'Leo should be present in attendance today');
  });

  console.log('\n--- 4. Workshop Tests ---');

  await itAsync('Load active workshops list', async () => {
    const res = await appsScript.getWorkshops();
    assert.strictEqual(res.success, true);
    assert.ok(res.data.length >= 3);
    assert.ok(res.data.some(w => w.CODE === 'W01'));
  });

  await itAsync('Workshop check-in succeeds', async () => {
    const res = await appsScript.workshopCheckIn({
      eventId: 'EVT001',
      participantId: 'P001',
      workshopCode: 'W01',
      date: today,
      time: nowTime,
      userId: 'USR001'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.WORKSHOP_CODE, 'W01');
  });

  await itAsync('Duplicate workshop check-in on the same day is rejected', async () => {
    const res = await appsScript.workshopCheckIn({
      eventId: 'EVT001',
      participantId: 'P001',
      workshopCode: 'W01',
      date: today,
      time: nowTime,
      userId: 'USR001'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'ALREADY_CHECKED_IN');
  });

  console.log('\n--- 5. Reports & Excel Export Tests ---');

  await itAsync('Fetch daily attendance report with enriched participant names', async () => {
    const res = await appsScript.getReportData({ eventId: 'EVT001', date: today, type: 'daily' });
    assert.strictEqual(res.success, true);
    assert.ok(Array.isArray(res.data));
    const leoRecord = res.data.find(r => r.PARTICIPANT_ID === 'P001');
    assert.ok(leoRecord, 'Report should contain Leo');
    assert.ok(leoRecord.PARTICIPANT_NAME.toLowerCase().includes('leo'));
  });

  await itAsync('Fetch full export data and build multi-sheet workbook', async () => {
    const res = await appsScript.getReportData({ eventId: 'EVT001', type: 'export' });
    assert.strictEqual(res.success, true);
    const data = res.data;

    // Verify all expected sheets exist
    assert.ok(data.summary, 'Summary data must exist');
    assert.ok(data.participants.length > 0, 'Participants must exist');
    assert.ok(data.attendance.length > 0, 'Attendance must exist');
    assert.ok(data.recap.length > 0, 'Recap must exist');
    assert.ok(data.panitia.length > 0, 'Panitia must exist');

    // Build XLSX workbook
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet([['Laporan Absenin'], ['Event', data.summary.eventName]]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'SUMMARY');

    const wsPeserta = XLSX.utils.json_to_sheet(data.participants);
    XLSX.utils.book_append_sheet(wb, wsPeserta, 'PESERTA');

    const wsAbsensi = XLSX.utils.json_to_sheet(data.attendance);
    XLSX.utils.book_append_sheet(wb, wsAbsensi, 'ABSENSI');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    assert.ok(buffer.length > 0, 'Excel buffer must not be empty');

    // Parse back to ensure file validity
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    assert.deepStrictEqual(readWb.SheetNames, ['SUMMARY', 'PESERTA', 'ABSENSI']);
  });

  console.log('\n--- 6. Acceptance Test Core Flow (AGENT.md Sec 61) ---');

  await itAsync('Full 18-step acceptance test simulation', async () => {
    // Reset data for a fresh run
    mockData.resetData();
    if (typeof appsScript.resetData === 'function') appsScript.resetData();

    // 1. Login sebagai panitia
    const loginRes = await appsScript.validateLogin('admin', 'password123');
    assert.strictEqual(loginRes.success, true);
    const token = generateToken(loginRes.data);
    assert.ok(token);

    // 2. Buka Absensi (ambil data peserta)
    const participantsRes = await appsScript.getParticipants();
    assert.strictEqual(participantsRes.success, true);

    // 3. Cari "Leo"
    const searchLeo = participantsRes.data.filter(p => p.NAME.toLowerCase().includes('leo'));

    // 4. Temukan peserta
    assert.ok(searchLeo.length > 0);
    const leo = searchLeo[0];
    assert.ok(leo.NAME.toLowerCase().includes('leo'));

    // 5. Check-in
    const checkinRes = await appsScript.checkIn({
      eventId: 'EVT001',
      participantId: leo.ID,
      date: today,
      time: nowTime,
      userId: loginRes.data.USER_ID
    });

    // 6. Pastikan success
    assert.strictEqual(checkinRes.success, true);

    // 7. Check-in lagi
    const checkinAgain = await appsScript.checkIn({
      eventId: 'EVT001',
      participantId: leo.ID,
      date: today,
      time: nowTime,
      userId: loginRes.data.USER_ID
    });

    // 8. Pastikan ditolak sebagai duplicate
    assert.strictEqual(checkinAgain.success, false);
    assert.strictEqual(checkinAgain.code, 'ALREADY_CHECKED_IN');

    // 9. Cari peserta yang tidak ada
    const searchNonExistent = participantsRes.data.filter(p => p.NAME.toLowerCase().includes('unknown person xyz'));
    assert.strictEqual(searchNonExistent.length, 0);

    // 10. Tambah peserta baru
    const addRes = await appsScript.addParticipant({
      name: 'dr. Andi Wibowo, Sp.PD',
      phone: '081999888777',
      institution: 'RS Siaga Medika',
      email: 'andi@example.com',
      product: 'Simposium Only',
      sympo: 1,
      workshopA: 0,
      workshopB: 0,
      workshopC: 0
    });

    // 11. Klik Simpan & Absen (tambah dan check in)
    assert.strictEqual(addRes.success, true);
    const newParticipant = addRes.data;

    const autoCheckinRes = await appsScript.checkIn({
      eventId: 'EVT001',
      participantId: newParticipant.ID,
      date: today,
      time: nowTime,
      userId: loginRes.data.USER_ID
    });

    // 12. Pastikan participant tersimpan
    const getNewP = await appsScript.getParticipantById(newParticipant.ID);
    assert.strictEqual(getNewP.success, true);
    assert.strictEqual(getNewP.data.NAME, 'dr. Andi Wibowo, Sp.PD');

    // 13. Pastikan attendance tersimpan
    assert.strictEqual(autoCheckinRes.success, true);

    // 14. Buka riwayat
    const historyRes = await appsScript.getAttendanceHistory({ eventId: 'EVT001', date: today });

    // 15. Pastikan data muncul
    assert.strictEqual(historyRes.success, true);
    assert.strictEqual(historyRes.data.length, 2, 'Should have 2 attendance records (Leo and Andi)');

    // 16. Buka laporan
    const reportRes = await appsScript.getReportData({ eventId: 'EVT001', type: 'export' });
    assert.strictEqual(reportRes.success, true);

    // 17. Export Excel
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet([['Laporan Absenin'], ['Event', reportRes.data.summary.eventName]]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'SUMMARY');
    const wsAbsensi = XLSX.utils.json_to_sheet(reportRes.data.attendance);
    XLSX.utils.book_append_sheet(wb, wsAbsensi, 'ABSENSI');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 18. Pastikan file valid
    assert.ok(buf.length > 1000);
    const parsed = XLSX.read(buf, { type: 'buffer' });
    assert.ok(parsed.SheetNames.includes('SUMMARY'));
    assert.ok(parsed.SheetNames.includes('ABSENSI'));
  });

  // Restore database to pristine state before test was run
  if (originalDbBackup) {
    fs.writeFileSync(DB_PATH, originalDbBackup, 'utf8');
  }

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log(`========================================\n`);

  if (testFailed > 0) {
    process.exit(1);
  }
}

runTests();

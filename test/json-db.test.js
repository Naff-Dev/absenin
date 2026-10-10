/**
 * Test Suite: JSON Local Database Provider
 * Verifies all 14 database methods on database/json.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Gunakan file database test terpisah agar tidak mengganggu data asli
const TEST_DB_PATH = path.resolve(__dirname, 'temp_test_db.json');
process.env.JSON_DB_PATH = TEST_DB_PATH;

const jsonProvider = require('../database/json');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== TESTING JSON LOCAL DATABASE PROVIDER ===\n');

  // Bersihkan file test jika ada
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  await test('init() creates test db file and returns summary', async () => {
    const res = await jsonProvider.init();
    assert.strictEqual(res.success, true);
    assert.ok(fs.existsSync(TEST_DB_PATH), 'File DB test harus terbuat');
  });

  await test('getEvent() returns active event', async () => {
    const res = await jsonProvider.getEvent();
    assert.strictEqual(res.success, true);
    assert.ok(res.data.EVENT_NAME.includes('PIT VIII PAPDI'));
    assert.strictEqual(res.data.STATUS, 'ACTIVE');
  });

  await test('validateLogin() works for valid, invalid, and inactive panitia', async () => {
    const valid = await jsonProvider.validateLogin('admin', 'password123');
    assert.strictEqual(valid.success, true);
    assert.strictEqual(valid.data.USERNAME, 'admin');

    const wrong = await jsonProvider.validateLogin('admin', 'wrongpass');
    assert.strictEqual(wrong.success, false);
    assert.strictEqual(wrong.code, 'INVALID_CREDENTIALS');

    const inactive = await jsonProvider.validateLogin('nonaktif', 'password123');
    assert.strictEqual(inactive.success, false);
    assert.strictEqual(inactive.code, 'ACCOUNT_INACTIVE');
  });

  await test('getParticipants() loads participants', async () => {
    const res = await jsonProvider.getParticipants();
    assert.strictEqual(res.success, true);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
  });

  let newParticipantId = null;

  await test('addParticipant() creates new participant with auto ID', async () => {
    const res = await jsonProvider.addParticipant({
      name: 'dr. Test Peserta JSON, Sp.PD',
      phone: '081234567899',
      institution: 'RS Test Banyumas',
      email: 'test@json.com',
      product: 'Simposium Only',
      sympo: 1,
      workshopA: 0,
      workshopB: 0,
      workshopC: 0
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.NAME, 'dr. Test Peserta JSON, Sp.PD');
    assert.ok(res.data.ID.startsWith('P'));
    newParticipantId = res.data.ID;
  });

  await test('getParticipantById() retrieves the newly added participant', async () => {
    const res = await jsonProvider.getParticipantById(newParticipantId);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.NAME, 'dr. Test Peserta JSON, Sp.PD');
  });

  const testDate = '2026-10-06';
  const testTime = '08:30:00';

  await test('checkIn() records attendance successfully', async () => {
    const res = await jsonProvider.checkIn({
      eventId: 'EVT001',
      participantId: newParticipantId,
      date: testDate,
      time: testTime,
      userId: 'USR001'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.STATUS, 'HADIR');
    assert.strictEqual(res.data.PARTICIPANT_ID, newParticipantId);
  });

  await test('checkIn() rejects duplicate check-in on the same date', async () => {
    const res = await jsonProvider.checkIn({
      eventId: 'EVT001',
      participantId: newParticipantId,
      date: testDate,
      time: testTime,
      userId: 'USR001'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'ALREADY_CHECKED_IN');
  });

  await test('getAttendanceToday() returns the attendance', async () => {
    const res = await jsonProvider.getAttendanceToday('EVT001', testDate);
    assert.strictEqual(res.success, true);
    const found = res.data.find(a => a.PARTICIPANT_ID === newParticipantId);
    assert.ok(found);
  });

  await test('getWorkshops() returns active workshops with real names', async () => {
    const res = await jsonProvider.getWorkshops();
    assert.strictEqual(res.success, true);
    assert.ok(res.data.length >= 3);
    assert.ok(res.data.some(w => w.NAME.includes('OSTEOARTHRITIS')));
  });

  await test('workshopCheckIn() records workshop attendance and rejects duplicate', async () => {
    const res1 = await jsonProvider.workshopCheckIn({
      eventId: 'EVT001',
      participantId: newParticipantId,
      workshopCode: 'W01',
      date: testDate,
      time: testTime,
      userId: 'USR001'
    });
    assert.strictEqual(res1.success, true);

    const res2 = await jsonProvider.workshopCheckIn({
      eventId: 'EVT001',
      participantId: newParticipantId,
      workshopCode: 'W01',
      date: testDate,
      time: testTime,
      userId: 'USR001'
    });
    assert.strictEqual(res2.success, false);
    assert.strictEqual(res2.code, 'ALREADY_CHECKED_IN');
  });

  await test('getReportData() returns enriched daily and export data', async () => {
    const daily = await jsonProvider.getReportData({ eventId: 'EVT001', date: testDate, type: 'daily' });
    assert.strictEqual(daily.success, true);
    const item = daily.data.find(d => d.PARTICIPANT_ID === newParticipantId);
    assert.ok(item);
    assert.strictEqual(item.PARTICIPANT_NAME, 'dr. Test Peserta JSON, Sp.PD');

    const exp = await jsonProvider.getReportData({ eventId: 'EVT001', type: 'export' });
    assert.strictEqual(exp.success, true);
    assert.ok(exp.data.summary);
    assert.ok(exp.data.recap.length > 0);
  });

  await test('addLog() logs activity', async () => {
    const res = await jsonProvider.addLog({
      userId: 'USR001',
      action: 'TEST_ACTION',
      participantId: newParticipantId,
      description: 'Test logging'
    });
    assert.strictEqual(res.success, true);
  });

  await test('getAllData() and importAllData() sync test', async () => {
    const all = await jsonProvider.getAllData();
    assert.ok(all.participants.length > 0);
    assert.ok(all.attendance.length > 0);

    const importRes = await jsonProvider.importAllData(all, { merge: true });
    assert.strictEqual(importRes.success, true);
  });

  // Cleanup file test
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  console.log(`\n========================================`);
  console.log(`JSON DB RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run();

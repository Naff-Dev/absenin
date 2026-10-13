/**
 * Test Suite: Single Attendance, Participant Editing, and Attendance Cancellation
 * Verifies all 4 user requirements:
 * 1. Single unified attendance (hanya satu absensi)
 * 2. Committee can edit participant details (including adding/removing workshops)
 * 3. Committee can edit attendance details and cancel/delete mistaken attendance (salah absen)
 * 4. Workshop attendance percentage breakdown calculation
 */

require('dotenv').config();
const assert = require('assert');
const db = require('../database');

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
  console.log('\n=== TESTING SINGLE ATTENDANCE, EDITING, & WORKSHOP BREAKDOWN ===\n');

  const testParticipantId = 'P001';
  const testDate = '2026-03-01';

  // 1. Participant retrieval
  let pOriginal = null;
  await test('Retrieve participant P001', async () => {
    const res = await db.getParticipantById(testParticipantId);
    assert.ok(res.success, 'Participant P001 must exist');
    assert.ok(res.data, 'Participant data must not be empty');
    pOriginal = res.data;
  });

  // 2. Edit Participant: committee can edit details & add workshop
  await test('Committee can edit participant details and add/change workshop', async () => {
    const editPayload = {
      name: pOriginal.NAME,
      phone: '081234999999',
      institution: 'RSUD Banyumas (Koreksi Panitia)',
      product: 'Simposium dan Workshop Lengkap',
      workshopA: 1,
      workshopB: 1, // Participant originally might only have A, now added B!
      workshopC: 0,
      note: 'VOUCHER - diverifikasi panitia'
    };

    const res = await db.updateParticipant(testParticipantId, editPayload);
    assert.ok(res.success, 'updateParticipant must return success');
    assert.strictEqual(res.data.PHONE, '081234999999');
    assert.strictEqual(res.data.INSTITUTION, 'RSUD Banyumas (Koreksi Panitia)');
    assert.strictEqual(res.data.WORKSHOP_A, 1);
    assert.strictEqual(res.data.WORKSHOP_B, 1);
    assert.strictEqual(res.data.WORKSHOP_C, 0);
  });

  // 3. Single Check-In (Absensi Tunggal)
  let checkInResult = null;
  await test('Single unified check-in works for participant', async () => {
    // Ensure clean state for test date
    await db.deleteAttendance(testParticipantId, { byParticipant: true, date: testDate });

    const checkInData = {
      eventId: 'EVT001',
      participantId: testParticipantId,
      date: testDate,
      time: '08:15',
      userId: 'USR001'
    };

    const res = await db.checkIn(checkInData);
    assert.ok(res.success, 'Check-in must succeed');
    assert.ok(res.data.ATTENDANCE_ID, 'Must have ATTENDANCE_ID');
    assert.strictEqual(res.data.STATUS, 'HADIR');
    checkInResult = res.data;
  });

  // 4. Duplicate Check-In Prevention (Absensi hanya satu kali)
  await test('Single check-in prevents duplicate attendance for the same day', async () => {
    const dupRes = await db.checkIn({
      eventId: 'EVT001',
      participantId: testParticipantId,
      date: testDate,
      time: '08:20',
      userId: 'USR001'
    });

    assert.strictEqual(dupRes.success, false);
    assert.strictEqual(dupRes.code, 'ALREADY_CHECKED_IN');
  });

  // 5. Edit Attendance Details (Ubah jam absensi)
  await test('Committee can edit attendance details (e.g. correction of check-in time)', async () => {
    assert.ok(checkInResult, 'checkInResult required');
    const attId = checkInResult.ATTENDANCE_ID;

    const res = await db.updateAttendance(attId, {
      time: '08:35',
      status: 'HADIR'
    });

    assert.ok(res.success, 'updateAttendance must succeed');
    assert.strictEqual(res.data.TIME, '08:35');
  });

  // 6. Workshop Breakdown calculation with single attendance
  await test('Workshop attendance percentage breakdown calculates correctly from unified attendance', async () => {
    const participantsRes = await db.getParticipants();
    const allP = participantsRes.data || [];
    const attRes = await db.getAttendanceToday('EVT001', testDate);
    const todayAtt = attRes.data || [];

    const checkedIds = new Set(todayAtt.map(a => a.PARTICIPANT_ID));

    // Workshop A breakdown
    const wsAParticipants = allP.filter(p => p.WORKSHOP_A == 1);
    const wsAAttended = wsAParticipants.filter(p => checkedIds.has(p.ID)).length;
    const wsAPercentage = wsAParticipants.length > 0 ? Math.round((wsAAttended / wsAParticipants.length) * 100) : 0;

    // Workshop B breakdown
    const wsBParticipants = allP.filter(p => p.WORKSHOP_B == 1);
    const wsBAttended = wsBParticipants.filter(p => checkedIds.has(p.ID)).length;
    const wsBPercentage = wsBParticipants.length > 0 ? Math.round((wsBAttended / wsBParticipants.length) * 100) : 0;

    assert.ok(wsAParticipants.length > 0, 'Workshop A must have participants');
    assert.ok(wsBParticipants.length > 0, 'Workshop B must have participants');
    assert.strictEqual(wsAAttended >= 1, true, 'At least P001 attended Workshop A');
    assert.strictEqual(wsBAttended >= 1, true, 'At least P001 attended Workshop B because workshop was added');
    console.log(`     -> Workshop A: ${wsAAttended}/${wsAParticipants.length} (${wsAPercentage}%)`);
    console.log(`     -> Workshop B: ${wsBAttended}/${wsBParticipants.length} (${wsBPercentage}%)`);
  });

  // 7. Cancel Check-in / Delete Attendance (Salah Absen)
  await test('Committee can cancel/delete mistaken check-in (Salah Absen)', async () => {
    const res = await db.deleteAttendance(testParticipantId, { byParticipant: true, date: testDate });
    assert.ok(res.success, 'deleteAttendance must succeed');

    // Verify participant is no longer present
    const attAfter = await db.getAttendanceToday('EVT001', testDate);
    const stillPresent = (attAfter.data || []).some(a => a.PARTICIPANT_ID === testParticipantId);
    assert.strictEqual(stillPresent, false, 'Participant must no longer be marked as present');
  });

  // 8. Re-check in works after cancellation
  await test('Participant can check in again after cancellation', async () => {
    const res = await db.checkIn({
      eventId: 'EVT001',
      participantId: testParticipantId,
      date: testDate,
      time: '09:00',
      userId: 'USR001'
    });

    assert.ok(res.success, 'New check-in after cancellation must succeed');

    // Cleanup: remove test checkin
    await db.deleteAttendance(testParticipantId, { byParticipant: true, date: testDate });
  });

  // 9. Restore original participant data
  await test('Restore original participant data for clean state', async () => {
    await db.updateParticipant(testParticipantId, {
      name: pOriginal.NAME,
      phone: pOriginal.PHONE || '',
      institution: pOriginal.INSTITUTION || '',
      email: pOriginal.EMAIL || '',
      product: pOriginal.PRODUCT || '',
      sympo: pOriginal.SYMPO,
      workshopA: pOriginal.WORKSHOP_A,
      workshopB: pOriginal.WORKSHOP_B,
      workshopC: pOriginal.WORKSHOP_C,
      note: pOriginal.NOTE || ''
    });
  });

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run();

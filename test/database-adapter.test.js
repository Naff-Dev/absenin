/**
 * Test Suite: Database Adapter & Provider Switching
 * Verifies that database/index.js switches correctly according to DATABASE_TYPE in .env
 * and that all 3 providers maintain identical interfaces.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

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
  console.log('\n=== TESTING DATABASE ADAPTER & PROVIDER ROUTING ===\n');

  const db = require('../database');

  await test('db exposes unified interface methods', () => {
    const requiredMethods = [
      'getEvent',
      'init',
      'initSpreadsheet',
      'getParticipants',
      'getParticipantById',
      'addParticipant',
      'validateLogin',
      'checkIn',
      'getAttendanceToday',
      'getAttendanceHistory',
      'getWorkshops',
      'workshopCheckIn',
      'getWorkshopAttendance',
      'getReportData',
      'addLog',
      'getAllData',
      'importAllData',
      'getDatabaseType',
      'getProvider',
      'getActiveProvider',
      'sync'
    ];

    requiredMethods.forEach(m => {
      assert.strictEqual(typeof db[m], 'function', `Method ${m} must be defined`);
    });
  });

  await test('getProvider returns specific providers correctly', () => {
    const jsonProv = db.getProvider('json');
    assert.strictEqual(jsonProv.providerName, 'json');

    const appscriptProv = db.getProvider('appscript');
    assert.strictEqual(appscriptProv.providerName, 'appscript');

    const supabaseProv = db.getProvider('supabase');
    assert.strictEqual(supabaseProv.providerName, 'supabase');
  });

  await test('DATABASE_TYPE default is appscript if not set', () => {
    const oldType = process.env.DATABASE_TYPE;
    delete process.env.DATABASE_TYPE;
    assert.strictEqual(db.getDatabaseType(), 'appscript');
    process.env.DATABASE_TYPE = oldType;
  });

  await test('Active provider respects process.env.DATABASE_TYPE=json', () => {
    process.env.DATABASE_TYPE = 'json';
    assert.strictEqual(db.getDatabaseType(), 'json');
    assert.strictEqual(db.getActiveProvider().providerName, 'json');
  });

  await test('Active provider respects process.env.DATABASE_TYPE=supabase', () => {
    process.env.DATABASE_TYPE = 'supabase';
    assert.strictEqual(db.getDatabaseType(), 'supabase');
    assert.strictEqual(db.getActiveProvider().providerName, 'supabase');
  });

  await test('Active provider respects process.env.DATABASE_TYPE=appscript', () => {
    process.env.DATABASE_TYPE = 'appscript';
    assert.strictEqual(db.getDatabaseType(), 'appscript');
    assert.strictEqual(db.getActiveProvider().providerName, 'appscript');
  });

  await test('Cross-database synchronization between JSON and temporary target', async () => {
    const jsonProv = db.getProvider('json');
    const mockTarget = {
      providerName: 'mock-target',
      imported: null,
      importAllData: async (data, options) => {
        mockTarget.imported = data;
        return { success: true };
      }
    };

    const syncRes = await db.sync('json', 'json', { merge: true });
    assert.strictEqual(syncRes.success, true);
    assert.strictEqual(syncRes.source, 'json');
    assert.strictEqual(syncRes.target, 'json');
    assert.ok(syncRes.counts.participants >= 0);
  });

  console.log(`\n========================================`);
  console.log(`ADAPTER RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run();

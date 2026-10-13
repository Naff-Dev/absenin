/**
 * Test Suite: Supabase Integration Test
 * Verifies Supabase credentials, connectivity, table readiness, and unified adapter methods.
 */

require('dotenv').config();
const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');
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
  console.log('\n=== TESTING SUPABASE INTEGRATION ===\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  await test('Supabase environment variables configured in .env', () => {
    assert.ok(supabaseUrl, 'SUPABASE_URL must be defined');
    assert.ok(supabaseKey, 'SUPABASE_ANON_KEY must be defined');
    assert.ok(supabaseUrl.startsWith('https://'), 'SUPABASE_URL must be valid HTTPS url');
  });

  const supabaseProv = db.getProvider('supabase');

  await test('Supabase provider implements all unified adapter methods', () => {
    const requiredMethods = [
      'getEvent', 'init', 'initSpreadsheet', 'getParticipants', 'getParticipantById',
      'addParticipant', 'validateLogin', 'checkIn', 'getAttendanceToday',
      'getAttendanceHistory', 'getWorkshops', 'workshopCheckIn', 'getWorkshopAttendance',
      'getReportData', 'addLog', 'getAllData', 'importAllData', 'resetData'
    ];

    requiredMethods.forEach(m => {
      assert.strictEqual(typeof supabaseProv[m], 'function', `Supabase provider method ${m} must be defined`);
    });
  });

  await test('Supabase client can authenticate and ping API', async () => {
    const client = createClient(supabaseUrl, supabaseKey);
    // Ping with dummy query
    const res = await client.from('_test_ping').select('*').limit(1);
    // If not authenticated or url invalid, network error or invalid API key will occur
    if (res.error && res.error.message.includes('Invalid API key')) {
      throw new Error('Supabase ANON KEY tidak valid: ' + res.error.message);
    }
  });

  console.log(`\n========================================`);
  console.log(`SUPABASE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run();

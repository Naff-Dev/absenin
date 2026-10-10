/**
 * CLI Script: Sinkronisasi Antar Database
 * Penggunaan:
 *   node scripts/sync-database.js <source> <target>
 *
 * Contoh:
 *   node scripts/sync-database.js appscript json
 *   node scripts/sync-database.js json supabase
 *   node scripts/sync-database.js supabase json
 */

require('dotenv').config();
const db = require('../database');

async function main() {
  const args = process.argv.slice(2);
  const source = args[0] || 'appscript';
  const target = args[1] || 'json';

  console.log(`\n========================================`);
  console.log(`🔄 Absenin Database Synchronizer`);
  console.log(`   Source: [${source.toUpperCase()}]`);
  console.log(`   Target: [${target.toUpperCase()}]`);
  console.log(`========================================\n`);

  try {
    const result = await db.sync(source, target, { merge: true });
    console.log('\n✓ SINKRONISASI BERHASIL!');
    console.log('Statistik data:', result.counts);
    console.log('Waktu sinkronisasi:', result.syncedAt);
    process.exit(0);
  } catch (err) {
    console.error('\n✗ SINKRONISASI GAGAL:');
    console.error(err.message);
    process.exit(1);
  }
}

main();

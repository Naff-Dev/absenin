/**
 * Absenin — Migration Script: Local JSON -> Supabase
 * 
 * Fungsi:
 * 1. Mengecek kredensial SUPABASE_URL & SUPABASE_ANON_KEY di .env
 * 2. Memeriksa ketersediaan tabel di Supabase
 * 3. Jika tabel sudah dibuat:
 *    - Melakukan upload/sinkronisasi seluruh data (210 peserta, panitia, workshops, event) ke Supabase
 *    - Menguji pembacaan data kembali
 *    - Mengubah DATABASE_TYPE=supabase di .env
 * 4. Jika tabel belum dibuat:
 *    - Menampilkan panduan ringkas & link langsung ke SQL Editor Supabase
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const db = require('../database');

const ENV_PATH = path.resolve(__dirname, '../.env');
const SQL_PATH = path.resolve(__dirname, '../database/supabase-schema.sql');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
};

async function main() {
  console.log(`\n${C.cyan}${C.bold}═════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bold}🚀 ABSENIN — MIGRASI DATABASE KE SUPABASE (POSTGRESQL)                ${C.reset}`);
  console.log(`${C.cyan}${C.bold}═════════════════════════════════════════════════════════════════════${C.reset}\n`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(`${C.red}❌ Error: SUPABASE_URL atau SUPABASE_ANON_KEY belum diisi di .env!${C.reset}`);
    process.exit(1);
  }

  // Ekstrak project ID dari URL (misal: https://xjhzdginnucughdesspt.supabase.co -> xjhzdginnucughdesspt)
  const match = supabaseUrl.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  const projectId = match ? match[1] : '';
  const sqlEditorUrl = projectId 
    ? `https://supabase.com/dashboard/project/${projectId}/sql/new` 
    : 'https://supabase.com/dashboard';

  console.log(`1. Menghubungi Supabase Project:`);
  console.log(`   ${C.bold}URL     :${C.reset} ${supabaseUrl}`);
  console.log(`   ${C.bold}Project :${C.reset} ${projectId || 'Custom'}`);

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // 2. Cek apakah tabel-tabel utama sudah ada
  console.log(`\n2. Memeriksa ketersediaan tabel di database Supabase...`);
  const tables = ['events', 'panitia', 'workshops', 'participants', 'attendance', 'workshop_attendance', 'logs'];
  const missingTables = [];

  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message.includes('Could not find the table') || error.message.includes('schema cache')) {
        missingTables.push(t);
      } else {
        console.warn(`   ⚠ Tabel [${t}] peringatan: ${error.message}`);
      }
    } else {
      console.log(`   ${C.green}✓ Tabel [${t}] TERSEDIA${C.reset}`);
    }
  }

  if (missingTables.length > 0) {
    console.log(`\n${C.yellow}═════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.yellow}${C.bold}📋 LANGKAH DIPERLUKAN: JALANKAN SQL SCHEMA DI SUPABASE DASHBOARD     ${C.reset}`);
    console.log(`${C.yellow}═════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`Tabel berikut belum dibuat: ${C.bold}${missingTables.join(', ')}${C.reset}\n`);
    console.log(`Langkah mudah (hanya 1 menit):`);
    console.log(`  1. Buka Supabase SQL Editor di browser:`);
    console.log(`     👉 ${C.cyan}${C.bold}${sqlEditorUrl}${C.reset}`);
    console.log(`  2. Salin seluruh isi file berikut:`);
    console.log(`     👉 ${C.bold}${SQL_PATH}${C.reset}`);
    console.log(`  3. Tempel (Paste) ke SQL Editor lalu klik tombol ${C.green}${C.bold}[RUN]${C.reset}.`);
    console.log(`  4. Setelah selesai, jalankan kembali script ini:`);
    console.log(`     👉 ${C.bold}node scripts/migrate-to-supabase.js${C.reset}\n`);
    process.exit(0);
  }

  // 3. Jika semua tabel sudah ada, lakukan upload / sinkronisasi data dari JSON ke Supabase
  console.log(`\n3. Semua tabel terdeteksi siap! Memulai sinkronisasi data dari JSON ke Supabase...`);
  try {
    const syncRes = await db.sync('json', 'supabase', { merge: true });
    console.log(`   ${C.green}✓ Data berhasil diunggah ke Supabase:${C.reset}`);
    console.log(`     - Peserta Resmi   : ${syncRes.counts.participants} orang`);
    console.log(`     - Akun Panitia    : ${syncRes.counts.panitia} akun`);
    console.log(`     - Workshops       : ${syncRes.counts.workshops} sesi`);
    console.log(`     - Event           : ${syncRes.counts.events} data`);
  } catch (syncErr) {
    console.error(`${C.red}❌ Gagal sinkronisasi data:${C.reset}`, syncErr.message);
    process.exit(1);
  }

  // 4. Verifikasi pembacaan dari Supabase
  console.log(`\n4. Verifikasi query provider Supabase...`);
  const supabaseProv = db.getProvider('supabase');
  const partCheck = await supabaseProv.getParticipants();
  console.log(`   ${C.green}✓ Berhasil mengambil ${partCheck.data.length} peserta dari Supabase!${C.reset}`);

  // 5. Update .env ke DATABASE_TYPE=supabase
  console.log(`\n5. Memperbarui konfigurasi .env...`);
  let envContent = fs.readFileSync(ENV_PATH, 'utf8');
  if (/^DATABASE_TYPE=.*/m.test(envContent)) {
    envContent = envContent.replace(/^DATABASE_TYPE=.*/m, 'DATABASE_TYPE=supabase');
  } else {
    envContent = `DATABASE_TYPE=supabase\n` + envContent;
  }
  fs.writeFileSync(ENV_PATH, envContent, 'utf8');
  console.log(`   ${C.green}✓ DATABASE_TYPE telah diubah menjadi: supabase di .env${C.reset}`);

  console.log(`\n${C.green}${C.bold}═════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}${C.bold}🎉 MIGRASI KE SUPABASE BERHASIL 100%!                                ${C.reset}`);
  console.log(`${C.green}${C.bold}═════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`Aplikasi Absenin sekarang aktif menggunakan Supabase PostgreSQL.`);
  console.log(`Jalankan server dengan:`);
  console.log(`   👉 ${C.cyan}${C.bold}npm run dev${C.reset}  atau  ${C.cyan}${C.bold}npm start${C.reset}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

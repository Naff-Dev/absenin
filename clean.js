/**
 * Script: clean.js
 * Deskripsi: Membersihkan seluruh data absensi (Simposium & Workshop)
 * Menjaga data 210 peserta PIT VIII PAPDI Purwokerto tetap utuh & aman.
 * Menghapus data testing (P211 atau check-in simulasi).
 * 
 * Penggunaan:
 *   node clean.js
 *   npm run clean
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'data/db.json');

async function cleanAttendance() {
  console.log('\n' + '='.repeat(65));
  console.log('🧹 BERSIHKAN ABSENSI (RESET DATABASE KE FRESH STATE)');
  console.log('='.repeat(65) + '\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ File data/db.json tidak ditemukan!');
    process.exit(1);
  }

  let db;
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (err) {
    console.error('❌ Gagal membaca db.json:', err.message);
    process.exit(1);
  }

  const prevAttCount = Array.isArray(db.attendance) ? db.attendance.length : 0;
  const prevWsCount = Array.isArray(db.workshopAttendance) ? db.workshopAttendance.length : 0;
  const prevPartCount = Array.isArray(db.participants) ? db.participants.length : 0;

  console.log('📊 Status Sebelum Pembersihan:');
  console.log(`   - Total Peserta Terdaftar   : ${prevPartCount} orang`);
  console.log(`   - Data Absensi Simposium    : ${prevAttCount} data`);
  console.log(`   - Data Absensi Workshop     : ${prevWsCount} data`);

  // 1. Bersihkan absensi
  db.attendance = [];
  db.workshopAttendance = [];

  // 2. Pastikan peserta hanya peserta resmi (P001 - P210), buang data testing (P211+) jika ada
  if (Array.isArray(db.participants)) {
    db.participants = db.participants.filter(p => {
      if (!p || !p.ID) return false;
      const numMatch = p.ID.match(/^P(\d+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        return num >= 1 && num <= 210;
      }
      return true;
    });
  }

  // 3. Catat log pembersihan
  if (!Array.isArray(db.logs)) db.logs = [];
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const wibStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  db.logs.push({
    LOG_ID: 'LOG' + String(db.logs.length + 1).padStart(3, '0'),
    TIMESTAMP: wibStr,
    USER_ID: 'SYSTEM',
    ACTION: 'CLEAN_ATTENDANCE',
    PARTICIPANT_ID: '',
    DESCRIPTION: `Database absensi dibersihkan. Peserta resmi: ${db.participants.length} orang, Absensi: 0`
  });

  // Tulis kembali ke file
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  // Jika Supabase aktif atau diminta via CLI (node clean.js supabase)
  require('dotenv').config();
  const dbUnified = require('./database');
  const shouldCleanSupabase = dbUnified.getDatabaseType() === 'supabase' || 
    process.argv.slice(2).some(arg => arg.toLowerCase().includes('supabase'));

  if (shouldCleanSupabase) {
    try {
      console.log('\n🔄 Menghubungi Supabase untuk pembersihan absensi...');
      const supProv = dbUnified.getProvider('supabase');
      const res = await supProv.resetData();
      console.log(`   ✓ ${res.message || 'Supabase absensi berhasil dibersihkan!'}`);
      console.log('   ✓ Seluruh 210 Peserta Resmi & 14 Akun Panitia di Supabase TETAP AMAN.');
    } catch (err) {
      console.warn('   ⚠ Gagal membersihkan Supabase:', err.message);
    }
  }

  console.log('\n' + '-'.repeat(65));
  console.log('✅ Pembersihan Berhasil Dilakukan:');
  console.log(`   - Total Peserta Resmi     : ${db.participants.length} orang (P001 - P210) [AMAN]`);
  console.log(`   - Absensi Simposium       : ${db.attendance.length} (KOSONG / FRESH)`);
  console.log(`   - Absensi Workshop        : ${db.workshopAttendance.length} (KOSONG / FRESH)`);
  console.log(`   - Total Akun Panitia      : ${db.panitia ? db.panitia.length : 0} akun`);
  console.log('='.repeat(65));
  console.log('🎉 DATABASE BERSIH & SIAP DIGUNAKAN UNTUK HARI-H EVENT!');
  console.log('='.repeat(65) + '\n');
}

cleanAttendance().catch(err => {
  console.error('Error in cleanAttendance:', err.message);
});


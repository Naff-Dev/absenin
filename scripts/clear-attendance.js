/**
 * Script: Bersihkan Seluruh Data Absensi (Fresh State)
 * - Mengosongkan data absensi simposium (attendance: [])
 * - Mengosongkan data absensi workshop (workshopAttendance: [])
 * - Menjaga seluruh 241 data peserta tetap utuh dan aman
 */

const fs = require('path');
const path = require('path');
const fsSync = require('fs');

const DB_PATH = path.resolve(process.cwd(), 'data/db.json');

function cleanAttendance() {
  console.log('\n===============================================================');
  console.log('🧹 MEMBERSIHKAN DATABASE ABSENSI (RESET KE FRESH STATE)');
  console.log('===============================================================\n');

  if (!fsSync.existsSync(DB_PATH)) {
    console.error('File db.json tidak ditemukan!');
    process.exit(1);
  }

  const db = JSON.parse(fsSync.readFileSync(DB_PATH, 'utf8'));

  const prevAttCount = db.attendance ? db.attendance.length : 0;
  const prevWsCount = db.workshopAttendance ? db.workshopAttendance.length : 0;
  const participantCount = db.participants ? db.participants.length : 0;

  console.log(`Status sebelum pembersihan:`);
  console.log(`  - Total Peserta             : ${participantCount} orang (TETAP AMAN)`);
  console.log(`  - Data Absensi Simposium     : ${prevAttCount} data`);
  console.log(`  - Data Absensi Workshop      : ${prevWsCount} data`);

  // Kosongkan absensi
  db.attendance = [];
  db.workshopAttendance = [];

  // Catat log
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const wibStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  db.logs.push({
    LOG_ID: 'LOG' + String(db.logs.length + 1).padStart(3, '0'),
    TIMESTAMP: wibStr,
    USER_ID: 'SYSTEM',
    ACTION: 'CLEAR_ATTENDANCE',
    PARTICIPANT_ID: '',
    DESCRIPTION: `Database absensi dibersihkan. Peserta: ${participantCount} orang, Absensi: 0`
  });

  fsSync.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  console.log('\n✓ Berhasil membersihkan database absensi:');
  console.log(`  - Absensi Simposium  : 0 (Kosong/Fresh)`);
  console.log(`  - Absensi Workshop   : 0 (Kosong/Fresh)`);
  console.log(`  - Data Peserta       : ${db.participants.length} orang (Tetap Terjaga Lengkap)`);
  console.log('\n===============================================================');
  console.log('✓ DATABASE ABSENSI BERSIH & SIAP DIGUNAKAN UNTUK HARI-H EVENT!');
  console.log('===============================================================\n');
}

cleanAttendance();

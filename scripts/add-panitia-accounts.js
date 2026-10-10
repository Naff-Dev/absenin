/**
 * Script: Menambahkan 10 Akun Panitia Utama (absen1 - absen10)
 * Password: password234
 * Menghasilkan file daftarakun.txt
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.cwd(), 'data/db.json');
const TXT_PATH = path.resolve(process.cwd(), 'daftarakun.txt');

const newAccounts = [
  {
    USER_ID: 'USR004',
    NAME: 'Panitia Utama 1',
    USERNAME: 'absen1',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR005',
    NAME: 'Panitia Utama 2',
    USERNAME: 'absen2',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR006',
    NAME: 'Panitia Utama 3',
    USERNAME: 'absen3',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR007',
    NAME: 'Panitia Utama 4',
    USERNAME: 'absen4',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR008',
    NAME: 'Panitia Utama 5',
    USERNAME: 'absen5',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR009',
    NAME: 'Panitia Utama 6',
    USERNAME: 'absen6',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR010',
    NAME: 'Panitia Utama 7',
    USERNAME: 'absen7',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR011',
    NAME: 'Panitia Utama 8',
    USERNAME: 'absen8',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR012',
    NAME: 'Panitia Utama 9',
    USERNAME: 'absen9',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR013',
    NAME: 'Panitia Utama 10',
    USERNAME: 'absen10',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  },
  {
    USER_ID: 'USR014',
    NAME: 'Panitia Utama (Alias)',
    USERNAME: 'absen',
    PASSWORD: 'password234',
    STATUS: 'ACTIVE'
  }
];

function main() {
  console.log('\n===============================================================');
  console.log('👥 MENAMBAHKAN AKUN PANITIA UTAMA ABSENIN');
  console.log('===============================================================\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error('File db.json tidak ditemukan!');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!db.panitia) db.panitia = [];

  // Tambahkan / update akun
  newAccounts.forEach(acc => {
    const existingIdx = db.panitia.findIndex(p => p.USERNAME === acc.USERNAME);
    if (existingIdx >= 0) {
      db.panitia[existingIdx] = acc;
    } else {
      db.panitia.push(acc);
    }
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`✓ Database db.json berhasil diperbarui dengan ${db.panitia.length} total akun panitia.`);

  // Buat isi daftarakun.txt
  const lines = [
    '========================================================================',
    '       DAFTAR AKUN PANITIA UTAMA — SISTEM ABSENIN PIT VIII PAPDI        ',
    '========================================================================',
    '',
    'Aplikasi URL : http://localhost:3000',
    'Event        : PIT VIII PAPDI Purwokerto 2026',
    'Waktu Dibuat : ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
    '',
    '------------------------------------------------------------------------',
    ' NO | USERNAME | PASSWORD    | NAMA OPERATOR         | STATUS  | HAK AKSES',
    '------------------------------------------------------------------------',
    '  1 | absen1   | password234 | Panitia Utama 1       | AKTIF   | Operator Absensi',
    '  2 | absen2   | password234 | Panitia Utama 2       | AKTIF   | Operator Absensi',
    '  3 | absen3   | password234 | Panitia Utama 3       | AKTIF   | Operator Absensi',
    '  4 | absen4   | password234 | Panitia Utama 4       | AKTIF   | Operator Absensi',
    '  5 | absen5   | password234 | Panitia Utama 5       | AKTIF   | Operator Absensi',
    '  6 | absen6   | password234 | Panitia Utama 6       | AKTIF   | Operator Absensi',
    '  7 | absen7   | password234 | Panitia Utama 7       | AKTIF   | Operator Absensi',
    '  8 | absen8   | password234 | Panitia Utama 8       | AKTIF   | Operator Absensi',
    '  9 | absen9   | password234 | Panitia Utama 9       | AKTIF   | Operator Absensi',
    ' 10 | absen10  | password234 | Panitia Utama 10      | AKTIF   | Operator Absensi',
    '------------------------------------------------------------------------',
    'Akun Cadangan / Alias Tambahan:',
    '  * | absen    | password234 | Panitia Utama (Alias) | AKTIF   | Operator Absensi',
    '  * | admin    | password123 | Panitia Utama         | AKTIF   | Super Admin',
    '  * | panitia  | password123 | Panitia Absensi       | AKTIF   | Operator Absensi',
    '------------------------------------------------------------------------',
    '',
    'PETUNJUK PENGGUNAAN:',
    '1. Buka browser pada perangkat panitia (HP / Laptop / Tablet).',
    '2. Akses alamat sistem Absenin (misal: http://localhost:3000 atau IP LAN).',
    '3. Masukkan salah satu Username (contoh: absen1 s/d absen10) dan Password: password234.',
    '4. Setiap panitia dapat login secara bersamaan di perangkat masing-masing.',
    '5. Semua check-in yang dicatat akan otomatis terhubung dengan ID panitia yang bertugas.',
    '========================================================================'
  ];

  const content = lines.join('\r\n');
  fs.writeFileSync(TXT_PATH, content, 'utf8');

  console.log(`✓ File daftarakun.txt berhasil dibuat di:\n  ${TXT_PATH}`);
  console.log('\n===============================================================');
  console.log('✓ SELESAI!');
  console.log('===============================================================\n');
}

main();

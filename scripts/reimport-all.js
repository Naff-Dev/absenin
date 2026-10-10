/**
 * Script: Hapus Semua Data & Import Ulang Peserta Resmi
 * Membaca file: daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx
 * Aturan:
 * - Baris dengan note 'BATAL' di-skip / tidak dimasukkan (2 peserta batal).
 * - Baris dengan note 'voucher' dan note lainnya disertakan dengan field NOTE.
 * - Field PHONE (No WhatsApp / HP) disertakan.
 * - Mengosongkan data absensi, absensi workshop, dan logs.
 * - Menerapkan ke JSON Local database (data/db.json) dan Google Apps Script (jika URL tersedia).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Cari file Excel terbaru (1) di root atau docs
let EXCEL_PATH = path.resolve(process.cwd(), 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx');
if (!fs.existsSync(EXCEL_PATH)) {
  EXCEL_PATH = path.resolve(__dirname, '..', 'docs', 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx');
}
if (!fs.existsSync(EXCEL_PATH)) {
  EXCEL_PATH = path.resolve(__dirname, '..', 'docs', 'daftar peserta PIT VIII PAPDI Purwokerto.xlsx');
}

const DB_JSON_PATH = path.resolve(process.cwd(), process.env.JSON_DB_PATH || './data/db.json');
const APPSCRIPT_URL = process.env.APPSCRIPT_URL || process.env.APPS_SCRIPT_URL;

function getWibTimestamp() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  const pad = n => String(n).padStart(2, '0');
  return `${wib.getFullYear()}-${pad(wib.getMonth() + 1)}-${pad(wib.getDate())} ${pad(wib.getHours())}:${pad(wib.getMinutes())}:${pad(wib.getSeconds())}`;
}

async function main() {
  console.log('\n======================================================');
  console.log('🔄 RESET DATABASE & RE-IMPORT PESERTA RESMI (TERBARU)');
  console.log('======================================================\n');

  // 1. Baca data dari file Excel
  console.log('1. Membaca file Excel:', EXCEL_PATH);
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('✗ File Excel tidak ditemukan:', EXCEL_PATH);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  const sheet = wb.Sheets['REGISTRASI'];
  if (!sheet) {
    console.error('✗ Sheet REGISTRASI tidak ditemukan di file Excel!');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const rawParticipantRows = rows.slice(5).filter(r => r && r[1] && typeof r[1] === 'string' && r[1].trim());

  console.log(`   Ditemukan ${rawParticipantRows.length} baris dengan nama di sheet REGISTRASI.`);

  // Filter baris yang batal (note mengandung 'batal')
  const batalList = [];
  const validParticipantRows = [];

  rawParticipantRows.forEach(r => {
    const note = r[8] ? String(r[8]).trim() : '';
    if (note.toUpperCase().includes('BATAL')) {
      batalList.push({ no: r[0], name: r[1].trim(), phone: r[2] || '', note });
    } else {
      validParticipantRows.push(r);
    }
  });

  console.log(`   Peserta dibatalkan (BATAL - di-skip): ${batalList.length} orang:`);
  batalList.forEach(b => console.log(`     - [Excel No ${b.no}] ${b.name} (${b.note})`));
  console.log(`   Peserta aktif yang akan diimport: ${validParticipantRows.length} orang.`);

  const timestamp = getWibTimestamp();

  const participants = validParticipantRows.map((r, i) => {
    const no = i + 1;
    const id = 'P' + String(no).padStart(3, '0');
    const name = String(r[1]).trim();
    const phone = r[2] ? String(r[2]).trim() : '';
    const product = r[3] ? String(r[3]).trim() : '';
    const sympo = r[4] == 1 ? 1 : 0;
    const wsA = r[5] == 1 ? 1 : 0;
    const wsB = r[6] == 1 ? 1 : 0;
    const wsC = r[7] == 1 ? 1 : 0;
    const note = r[8] ? String(r[8]).trim() : '';

    return {
      ID: id,
      NO: no,
      NAME: name,
      PHONE: phone,
      INSTITUTION: '',
      EMAIL: '',
      PRODUCT: product,
      SYMPO: sympo,
      WORKSHOP_A: wsA,
      WORKSHOP_B: wsB,
      WORKSHOP_C: wsC,
      NOTE: note,
      SOURCE: 'IMPORT',
      CREATED_AT: timestamp,
      UPDATED_AT: timestamp
    };
  });

  const voucherList = participants.filter(p => (p.NOTE || '').toLowerCase().includes('voucher'));
  console.log(`   Peserta dengan ketentuan VOUCHER: ${voucherList.length} orang:`);
  voucherList.forEach(v => console.log(`     - [${v.ID}] ${v.NAME} (${v.PHONE || 'No Phone'})`));

  // 2. Format struktur Database Baru (Bersih)
  const freshDb = {
    events: [
      {
        EVENT_ID: 'EVT001',
        EVENT_NAME: 'PIT VIII PAPDI Purwokerto 2026',
        START_DATE: '2026-10-17',
        END_DATE: '2026-10-18',
        LOCATION: 'Java Heritage Hotel Purwokerto',
        STATUS: 'ACTIVE'
      }
    ],
    panitia: [
      {
        USER_ID: 'USR001',
        NAME: 'Panitia Utama',
        USERNAME: 'admin',
        PASSWORD: 'password123',
        STATUS: 'ACTIVE'
      },
      {
        USER_ID: 'USR002',
        NAME: 'Panitia Absensi',
        USERNAME: 'panitia',
        PASSWORD: 'password123',
        STATUS: 'ACTIVE'
      },
      {
        USER_ID: 'USR003',
        NAME: 'Akun Nonaktif',
        USERNAME: 'nonaktif',
        PASSWORD: 'password123',
        STATUS: 'INACTIVE'
      },
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
    ],
    workshops: [
      {
        CODE: 'W01',
        NAME: 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION',
        DATE: '2026-10-17',
        TIME: '08:00 - 12:00',
        ROOM: 'Ruang Workshop A',
        QUOTA: 60,
        STATUS: 'ACTIVE'
      },
      {
        CODE: 'W02',
        NAME: 'BEDSIDE ULTRASOUND IN CRITICAL CARE',
        DATE: '2026-10-17',
        TIME: '13:00 - 17:00',
        ROOM: 'Ruang Workshop B',
        QUOTA: 80,
        STATUS: 'ACTIVE'
      },
      {
        CODE: 'W03',
        NAME: 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS',
        DATE: '2026-10-18',
        TIME: '08:00 - 12:00',
        ROOM: 'Ruang Workshop C',
        QUOTA: 40,
        STATUS: 'ACTIVE'
      }
    ],
    participants: participants,
    attendance: [],
    workshopAttendance: [],
    logs: [
      {
        LOG_ID: 'LOG001',
        TIMESTAMP: timestamp,
        USER_ID: 'SYSTEM',
        ACTION: 'DATABASE_RESET_IMPORT',
        PARTICIPANT_ID: '',
        DESCRIPTION: `Database di-reset & diimport ulang: ${participants.length} peserta resmi (2 dibatalkan di-skip)`
      }
    ]
  };

  // 3. Tulis ke data/db.json
  console.log('\n2. Menulis data bersih ke JSON Local database:', DB_JSON_PATH);
  const dir = path.dirname(DB_JSON_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tempPath = `${DB_JSON_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(freshDb, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_JSON_PATH);
  console.log(`   ✓ File ${DB_JSON_PATH} berhasil ditulis! (${participants.length} peserta, 0 absensi).`);

  // 4. Jika Apps Script terhubung, reset & update Apps Script juga
  if (APPSCRIPT_URL && !APPSCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
    console.log('\n3. Mengirim reset & reimport ke Google Apps Script Web App...');
    try {
      // Setup Workshops
      await fetch(`${APPSCRIPT_URL}?action=setupWorkshops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      // Import Peserta dengan clearExisting: true
      const appsScriptList = participants.map(p => ({
        id: p.ID,
        no: p.NO,
        name: p.NAME,
        phone: p.PHONE,
        institution: p.INSTITUTION,
        email: p.EMAIL,
        product: p.PRODUCT,
        sympo: p.SYMPO,
        workshopA: p.WORKSHOP_A,
        workshopB: p.WORKSHOP_B,
        workshopC: p.WORKSHOP_C,
        note: p.NOTE,
        source: p.SOURCE
      }));

      const res = await fetch(`${APPSCRIPT_URL}?action=importParticipants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearExisting: true,
          participants: appsScriptList
        })
      });
      const data = await res.json();
      console.log('   ✓ Google Apps Script:', data.message || 'Berhasil diupdate');
    } catch (err) {
      console.warn('   ⚠ Gagal sinkron ke Apps Script:', err.message);
    }
  }

  // 5. Tampilkan ringkasan data
  console.log('\n======================================================');
  console.log('✓ RESET & IMPORT ULANG SUKSES!');
  console.log('======================================================');
  console.log(`Total Peserta Valid  : ${participants.length} orang (P001 - P${String(participants.length).padStart(3, '0')})`);
  console.log(`Dengan No HP         : ${participants.filter(p => p.PHONE).length} orang`);
  console.log(`Dengan Catatan Voucher: ${voucherList.length} orang`);
  console.log(`Peserta Dibatalkan   : ${batalList.length} orang (di-skip)`);
  console.log(`Total Absensi        : 0 (Kosong/Fresh)`);
  console.log('======================================================\n');
}

main();

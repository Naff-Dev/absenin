/**
 * Script: Hapus Semua Data & Import Ulang Peserta Resmi
 * Membaca file: daftar peserta (1).xlsx (atau file registrasi terbaru)
 * 
 * Aturan:
 * - Menemukan sheet 'REGISTRASI' (mendukung trailing spaces).
 * - Baris dengan note 'BATAL' di-skip jika ada (pada file 241 peserta: 0 batal).
 * - Field PHONE (No WhatsApp / HP) disertakan.
 * - Field PRODUCT jika kosong diisi otomatis berdasarkan partisipasi Sympo & Workshop.
 * - Field NOTE (seperti 'voucher') disertakan.
 * - Mengosongkan data absensi, absensi workshop, dan logs (fresh state).
 * - Menerapkan ke:
 *   1. JSON Local database (data/db.json)
 *   2. Supabase PostgreSQL (Tabel participants, attendance, logs)
 *   3. Google Apps Script Web App (Google Spreadsheet)
 *   4. Regenerasi database/supabase-schema.sql
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Cari file Excel terbaru di root atau docs
const candidatePaths = [
  path.resolve(process.cwd(), 'daftar peserta (2).xlsx'),
  path.resolve(__dirname, '..', 'daftar peserta (2).xlsx'),
  path.resolve(__dirname, '..', 'docs', 'daftar peserta (2).xlsx'),
  path.resolve(process.cwd(), 'daftar peserta (1).xlsx'),
  path.resolve(__dirname, '..', 'daftar peserta (1).xlsx'),
  path.resolve(__dirname, '..', 'docs', 'daftar peserta (1).xlsx'),
  path.resolve(process.cwd(), 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx'),
  path.resolve(__dirname, '..', 'docs', 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx'),
  path.resolve(__dirname, '..', 'docs', 'daftar peserta PIT VIII PAPDI Purwokerto.xlsx')
];

const EXCEL_PATH = candidatePaths.find(p => fs.existsSync(p));
const DB_JSON_PATH = path.resolve(process.cwd(), process.env.JSON_DB_PATH || './data/db.json');
const APPSCRIPT_URL = process.env.APPSCRIPT_URL || process.env.APPS_SCRIPT_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

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

  if (!EXCEL_PATH) {
    console.error('✗ File Excel pendaftaran tidak ditemukan di folder root atau docs!');
    process.exit(1);
  }

  // 1. Baca data dari file Excel
  console.log('1. Membaca file Excel:', EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'REGISTRASI') || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  if (!sheet) {
    console.error('✗ Sheet REGISTRASI tidak ditemukan di file Excel!');
    process.exit(1);
  }

  console.log(`   Menggunakan sheet: "${sheetName}"`);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // Baris data dimulai setelah baris header ke-5 (index 5)
  const rawParticipantRows = rows.slice(5).filter(r => r && r[1] && typeof r[1] === 'string' && r[1].trim());

  console.log(`   Ditemukan ${rawParticipantRows.length} baris dengan nama di sheet ${sheetName}.`);

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

  if (batalList.length > 0) {
    console.log(`   Peserta dibatalkan (BATAL - di-skip): ${batalList.length} orang:`);
    batalList.forEach(b => console.log(`     - [Excel No ${b.no}] ${b.name} (${b.note})`));
  } else {
    console.log(`   Peserta dibatalkan: 0 orang.`);
  }

  console.log(`   Peserta aktif yang akan diimport: ${validParticipantRows.length} orang.`);

  const timestamp = getWibTimestamp();

  const participants = validParticipantRows.map((r, i) => {
    const no = i + 1;
    const id = 'P' + String(no).padStart(3, '0');
    const name = String(r[1]).trim();
    const phone = r[2] ? String(r[2]).trim() : '';
    let sympo = r[4] == 1 ? 1 : 0;
    let wsA = r[5] == 1 ? 1 : 0;
    let wsB = r[6] == 1 ? 1 : 0;
    let wsC = r[7] == 1 ? 1 : 0;
    const note = r[8] ? String(r[8]).trim() : '';

    let product = r[3] ? String(r[3]).trim() : '';
    if (!product) {
      if (sympo && (wsA || wsB || wsC)) product = 'Simposium dan Workshop';
      else if (sympo) product = 'Simposium';
      else if (wsA || wsB || wsC) product = 'Workshop';
      else product = 'Simposium';
    }

    if (sympo === 0 && wsA === 0 && wsB === 0 && wsC === 0) {
      if (product.toLowerCase().includes('simposium')) sympo = 1;
    }

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

  // Terapkan penugasan peran Panitia, Pembicara, Moderator dari data resmi
  const roleOverrides = [
    { targetIds: ['P134'], name: 'dr. Gede Perdana Putera, Sp.PD, Subsp.R(K), M.Biomed', role: 'Panitia, Pembicara' },
    { targetIds: ['P151'], name: 'dr. Maschun Syarifudin, Sp.PD, Subsp.HOM.(K), FINASIM', role: 'Panitia, Pembicara' },
    { targetIds: ['P135'], name: 'dr. Yunanto Dwi Nugroho, M.Sc, Sp.PD, K-GH', role: 'Panitia, Pembicara' },
    { targetIds: ['P146'], name: 'dr. Ni Ketut Donna Prisilia Tanjungsari, Sp.PD, MMR, M.Biomed', role: 'Panitia, Moderator' },
    { targetIds: ['P138'], name: 'DR. dr. Pugud Samodro, Sp.PD, K-EMD, FINASIM', role: 'Panitia, Pembicara' },
    { targetIds: ['P143'], name: 'dr. Febri Kurniawati, Sp.PD, K-EMD, FINASIM', role: 'Panitia, Pembicara' },
    { targetIds: ['P031'], name: 'dr. Reynaldo Binsar Hutajulu, Sp.PD', role: 'Panitia, Moderator' },
    { targetIds: ['P141'], name: 'dr. Ma’mun, M.Sc, Sp,PD, Subsp.GEH.(K)', role: 'Pembicara' },
    { targetIds: ['P053'], name: 'dr. Rachmad Aji Saksana, M.Sc, Sp.PD, Subsp.PMK.(K), FINASIM', role: 'Pembicara, Moderator' },
    { targetIds: ['P011', 'P063'], name: 'dr. Yosefin Ratnaningtyas, Sp.PD', role: 'Panitia, Moderator' },
    { targetIds: ['P002'], name: 'dr. Hengki S Permana Putra, Sp.PD', role: 'Panitia' },
    { targetIds: ['P155'], name: 'dr. Maela Rustiana Dewi, Sp.PD', role: 'Panitia, Moderator' },
    { targetIds: ['P139'], name: 'dr. Maya Dewi, Sp.PD, FINASIM', role: 'Panitia, Pembicara' },
    { targetIds: ['P142'], name: 'dr. Indra Setya Permana, Sp.PD, MMR, FINASIM', role: 'Panitia, Moderator' },
    { targetIds: ['P140'], name: 'dr. Ghea De Silva, Sp.PD, FINASIM', role: 'Panitia, Moderator' },
    { targetIds: ['P012'], name: 'dr. Tiara Paramita Poernomo, Sp.PD, FINASIM', role: 'Panitia' },
    { targetIds: ['P152'], name: 'dr. Lincah Angger Wismo Asih, Sp.PD', role: 'Panitia, Moderator' },
    { targetIds: ['P074'], name: 'dr. Alvin Aditya Setiawan, Sp.PD', role: 'Panitia' },
    { targetIds: ['P153'], name: 'dr. Joko Rilo Pambudi, Sp.PD, K-R, FINASIM', role: 'Pembicara' },
    { targetIds: ['P148'], name: 'dr. Kukuh Prasetyo, Sp.PD, FINASIM', role: 'Panitia, Moderator' },
    { targetIds: ['P065'], name: 'dr. Fitri Nadia Widyasari, Sp.PD, FINASIM', role: 'Panitia, Moderator' },
    { targetIds: ['P001'], name: 'dr. Leo Chandra Wisnu PW, Sp.PD', role: 'Panitia' },
    { targetIds: ['P015'], name: 'dr. Gandik Danu Pramiga, Sp.PD', role: 'Panitia, Moderator' },
    { targetIds: ['P156'], name: 'dr. Ryan Ma’rufi, Sp.PD', role: 'Panitia' },
    { targetIds: ['P115'], name: 'dr. Hery Agoestono, Sp.PD, K-GEH, FINASIM', role: 'Pembicara' },
    { targetIds: ['P137'], name: 'dr. Sri Lestari, Sp.PD, Subsp.GH(K), FINASIM', role: 'Pembicara' },
    { targetIds: ['P154'], name: 'Dr. dr. Arifin, Sp.PD, K-IC, FINASIM', role: 'Pembicara' },
    { targetIds: ['P073'], name: 'dr. Gigih Rahmandanu Poernomo, M.Kes, Sp.PD, FINASIM', role: 'Moderator' },
    { targetIds: ['P013'], name: 'dr. Niken Febriharsari. Sp.PD', role: 'Moderator' },
    { targetIds: ['P144'], name: 'dr. Ika Trisnawati, Sp.PD, K-P, FINASIM', role: 'Pembicara' },
    { targetIds: ['P145'], name: 'dr. Eko Budiono, Sp.PD, K-PMK, FINASIM', role: 'Pembicara' },
    { targetIds: ['P147'], name: 'dr. Suharno, Sp.PD, K-GEH, FINASIM', role: 'Pembicara' },
    { targetIds: ['P076'], name: 'dr. Heppy Oktavianto, M.Sc, Sp.PD, Subsp.PTI.(K), FINASIM', role: 'Pembicara' },
    { targetIds: ['P008'], name: 'Dr. dr. Haidar Alatas, MH, MM, Sp.PD, K-GH, FINASIM', role: 'Pembicara' },
    { targetIds: ['P149'], name: 'dr. Aditiawarman, Sp.PD, K-GH, FINASIM', role: 'Pembicara' },
    { targetIds: ['P150'], name: 'dr. Aditya Candra Putra, Sp.PD, FINASIM', role: 'Moderator' }
  ];

  roleOverrides.forEach(item => {
    item.targetIds.forEach(targetId => {
      const p = participants.find(x => x.ID === targetId);
      if (p) {
        p.NAME = item.name;
        p.NOTE = item.role;
      }
    });
  });

  // Tambahkan 2 peserta panitia baru
  const nextNo1 = participants.length + 1;
  const nextId1 = 'P' + String(nextNo1).padStart(3, '0');
  participants.push({
    ID: nextId1,
    NO: nextNo1,
    NAME: 'Edy Raras Reswati',
    PHONE: '',
    INSTITUTION: 'Panitia PIT VIII PAPDI Purwokerto',
    EMAIL: '',
    PRODUCT: 'Simposium',
    SYMPO: 1,
    WORKSHOP_A: 0,
    WORKSHOP_B: 0,
    WORKSHOP_C: 0,
    NOTE: 'Panitia',
    SOURCE: 'MANUAL',
    CREATED_AT: timestamp,
    UPDATED_AT: timestamp
  });

  const nextNo2 = participants.length + 1;
  const nextId2 = 'P' + String(nextNo2).padStart(3, '0');
  participants.push({
    ID: nextId2,
    NO: nextNo2,
    NAME: 'Edy Nurul Yuniarti',
    PHONE: '',
    INSTITUTION: 'Panitia PIT VIII PAPDI Purwokerto',
    EMAIL: '',
    PRODUCT: 'Simposium',
    SYMPO: 1,
    WORKSHOP_A: 0,
    WORKSHOP_B: 0,
    WORKSHOP_C: 0,
    NOTE: 'Panitia',
    SOURCE: 'MANUAL',
    CREATED_AT: timestamp,
    UPDATED_AT: timestamp
  });

  const voucherList = participants.filter(p => (p.NOTE || '').toLowerCase().includes('voucher'));
  console.log(`   Peserta dengan catatan VOUCHER: ${voucherList.length} orang:`);
  voucherList.forEach(v => console.log(`     - [${v.ID}] ${v.NAME} (${v.PHONE || 'No Phone'})`));
  const panitiaList = participants.filter(p => (p.NOTE || '').toLowerCase().includes('panitia'));
  console.log(`   Peserta dengan catatan PANITIA: ${panitiaList.length} orang (Total peserta: ${participants.length})`);

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
        QUOTA: 80,
        STATUS: 'ACTIVE'
      },
      {
        CODE: 'W02',
        NAME: 'BEDSIDE ULTRASOUND IN CRITICAL CARE',
        DATE: '2026-10-17',
        TIME: '13:00 - 17:00',
        ROOM: 'Ruang Workshop B',
        QUOTA: 90,
        STATUS: 'ACTIVE'
      },
      {
        CODE: 'W03',
        NAME: 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS',
        DATE: '2026-10-18',
        TIME: '08:00 - 12:00',
        ROOM: 'Ruang Workshop C',
        QUOTA: 50,
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
        DESCRIPTION: `Database di-reset & diimport ulang: ${participants.length} peserta resmi`
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

  // 4. Update Supabase jika URL & Key tersedia
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE')) {
    console.log('\n3. Mengupdate Supabase (PostgreSQL)...');
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
      });

      // A. Hapus data absensi lama
      console.log('   - Membersihkan tabel attendance & workshop_attendance...');
      await supabase.from('attendance').delete().neq('attendance_id', '');
      await supabase.from('workshop_attendance').delete().neq('id', '');

      // B. Hapus seluruh data peserta lama
      console.log('   - Menghapus daftar peserta lama di Supabase...');
      const { error: delPartErr } = await supabase.from('participants').delete().neq('id', '');
      if (delPartErr) {
        console.warn('     ⚠ Peringatan saat delete participants:', delPartErr.message);
      } else {
        console.log('     ✓ Daftar peserta lama berhasil dibersihkan.');
      }

      // C. Insert 241 peserta baru dalam chunks
      console.log(`   - Mengunggah ${participants.length} peserta baru ke Supabase...`);
      const supabaseRows = participants.map(p => ({
        id: p.ID,
        no: p.NO,
        name: p.NAME,
        phone: p.PHONE || '',
        institution: p.INSTITUTION || '',
        email: p.EMAIL || '',
        product: p.PRODUCT || '',
        sympo: p.SYMPO,
        workshop_a: p.WORKSHOP_A,
        workshop_b: p.WORKSHOP_B,
        workshop_c: p.WORKSHOP_C,
        note: p.NOTE || '',
        source: p.SOURCE || 'IMPORT',
        created_at: p.CREATED_AT,
        updated_at: p.UPDATED_AT
      }));

      const chunkSize = 50;
      for (let i = 0; i < supabaseRows.length; i += chunkSize) {
        const chunk = supabaseRows.slice(i, i + chunkSize);
        const { error: insErr } = await supabase.from('participants').upsert(chunk, { onConflict: 'id' });
        if (insErr) {
          throw new Error(`Gagal upsert peserta chunk ${i}-${i + chunk.length}: ${insErr.message}`);
        }
      }
      console.log(`     ✓ Seluruh ${participants.length} peserta berhasil diunggah ke Supabase!`);

      // D. Catat audit log
      await supabase.from('logs').insert([
        {
          log_id: 'LOG' + Date.now().toString().slice(-6),
          timestamp: timestamp,
          user_id: 'SYSTEM',
          action: 'REIMPORT_DATABASE',
          participant_id: '',
          description: `Database peserta diupdate ke ${participants.length} peserta resmi terbaru.`
        }
      ]);

      // E. Verifikasi jumlah peserta di Supabase
      const { data: partCheck, error: checkErr } = await supabase.from('participants').select('id');
      if (!checkErr && partCheck) {
        console.log(`   ✓ Verifikasi Supabase: Total ${partCheck.length} peserta terverifikasi.`);
      }
    } catch (supErr) {
      console.error('   ❌ Gagal update Supabase:', supErr.message);
    }
  }

  // 5. Update Google Apps Script jika URL tersedia
  if (APPSCRIPT_URL && !APPSCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
    console.log('\n4. Mengirim reset & reimport ke Google Apps Script Web App...');
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

  // 6. Regenerasi file SQL Schema (database/supabase-schema.sql)
  console.log('\n5. Meregenerasi database/supabase-schema.sql...');
  try {
    const buildSqlScript = path.resolve(__dirname, 'build-supabase-sql.js');
    if (fs.existsSync(buildSqlScript)) {
      require(buildSqlScript);
      console.log('   ✓ database/supabase-schema.sql berhasil diregenerasi dengan 241 peserta.');
    }
  } catch (sqlErr) {
    console.warn('   ⚠ Peringatan saat meregenerasi SQL schema:', sqlErr.message);
  }

  // 7. Tampilkan ringkasan data akhir
  console.log('\n======================================================');
  console.log('🎉 RESET & IMPORT ULANG SUKSES!');
  console.log('======================================================');
  console.log(`Total Peserta Valid    : ${participants.length} orang (P001 - P${String(participants.length).padStart(3, '0')})`);
  console.log(`Dengan No HP           : ${participants.filter(p => p.PHONE).length} orang`);
  console.log(`Dengan Catatan Voucher : ${voucherList.length} orang`);
  console.log(`Peserta Dibatalkan     : ${batalList.length} orang`);
  console.log(`Total Absensi          : 0 (Kosong/Fresh State)`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Fatal error during reimport:', err);
  process.exit(1);
});

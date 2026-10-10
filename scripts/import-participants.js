/**
 * Script Import Peserta dari Excel ke Google Apps Script / Google Spreadsheet
 * File sumber: daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let EXCEL_PATH = path.resolve(process.cwd(), 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx');
if (!fs.existsSync(EXCEL_PATH)) {
  EXCEL_PATH = path.resolve(__dirname, '..', 'docs', 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx');
}
if (!fs.existsSync(EXCEL_PATH)) {
  EXCEL_PATH = path.resolve(__dirname, '..', 'docs', 'daftar peserta PIT VIII PAPDI Purwokerto.xlsx');
}

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || process.env.APPSCRIPT_URL;

async function run() {
  console.log('Membaca file Excel:', EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheet = wb.Sheets['REGISTRASI'];

  if (!sheet) {
    console.error('Sheet REGISTRASI tidak ditemukan!');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // Data dimulai dari baris ke-5 (index 5)
  const rawParticipantRows = rows.slice(5).filter(r => r && r[1] && typeof r[1] === 'string' && r[1].trim());

  // Filter BATAL
  const participantRows = rawParticipantRows.filter(r => {
    const note = r[8] ? String(r[8]).trim() : '';
    return !note.toUpperCase().includes('BATAL');
  });

  console.log(`Ditemukan ${participantRows.length} data peserta valid (${rawParticipantRows.length - participantRows.length} batal dilewati).`);

  const participants = participantRows.map((r, i) => {
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
      id,
      no,
      name,
      phone,
      institution: '',
      email: '',
      product,
      sympo,
      workshopA: wsA,
      workshopB: wsB,
      workshopC: wsC,
      note,
      source: 'IMPORT'
    };
  });

  console.log('Contoh 3 peserta pertama:');
  console.log(participants.slice(0, 3));

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
    console.log('\n[PERHATIAN] APPS_SCRIPT_URL belum diatur di .env. Data siap diimpor.');
    return;
  }

  console.log(`\nMengirim ${participants.length} peserta ke Google Apps Script Web App...`);
  console.log('Target URL:', APPS_SCRIPT_URL);

  try {
    // 1. Update Workshops di spreadsheet jika diperlukan
    console.log('1. Mengirim konfigurasi Workshop A, B, C...');
    const wsRes = await fetch(`${APPS_SCRIPT_URL}?action=setupWorkshops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const wsData = await wsRes.json();
    console.log('   Hasil update workshop:', wsData.message || wsData);

    // 2. Import Peserta
    console.log(`2. Mengirim ${participants.length} data peserta...`);
    const pRes = await fetch(`${APPS_SCRIPT_URL}?action=importParticipants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clearExisting: true,
        participants
      })
    });
    const pData = await pRes.json();
    console.log('   Hasil import peserta:', pData.message || pData);
    console.log('\n✓ SUKSES: Seluruh data peserta telah tersimpan di Google Spreadsheet!');
  } catch (err) {
    console.error('Gagal mengirim ke Apps Script:', err.message);
  }
}

run();

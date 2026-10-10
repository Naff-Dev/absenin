/**
 * Script: Simulasi Absensi 2 Hari PIT VIII PAPDI Purwokerto 2026
 * - Hari 1: 2026-10-17
 * - Hari 2: 2026-10-18
 * Menghasilkan absensi simposium dan workshop yang realistis.
 * Menghasilkan file Excel laporan lengkap.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DB_PATH = path.resolve(process.cwd(), 'data/db.json');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTime(startHour, startMin, endHour, endMin) {
  const totalStart = startHour * 60 + startMin;
  const totalEnd = endHour * 60 + endMin;
  const pick = randomInt(totalStart, totalEnd);
  const h = Math.floor(pick / 60);
  const m = pick % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function run() {
  console.log('\n===============================================================');
  console.log('🚀 MEMULAI SIMULASI ABSENSI 2 HARI (PIT VIII PAPDI PURWOKERTO)');
  console.log('===============================================================\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error('File db.json tidak ditemukan!');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const participants = db.participants || [];

  console.log(`Jumlah total peserta aktif: ${participants.length} orang.`);

  const DAY1 = '2026-10-17';
  const DAY2 = '2026-10-18';
  const operators = ['USR001', 'USR002'];

  const attendance = [];
  const workshopAttendance = [];
  let absIdCounter = 1;
  let waIdCounter = 1;

  // Set seed-like deterministic-looking distribution
  // Hari 1: sekitar 182 hadir (~87%)
  // Hari 2: sekitar 190 hadir (~90%)
  const day1Attendees = [];
  const day2Attendees = [];

  participants.forEach((p, idx) => {
    // 80% hadir kedua hari, 10% hari 1 saja, 8% hari 2 saja, 2% tidak hadir
    const r = ((idx * 37 + 13) % 100);

    const attendDay1 = r < 88; // 88%
    const attendDay2 = (r < 78) || (r >= 88 && r < 98); // 88%

    if (attendDay1) {
      day1Attendees.push(p);
      const time = randomTime(7, 10, 8, 55);
      const op = operators[idx % 2];
      const absRecord = {
        ATTENDANCE_ID: 'ABS' + String(absIdCounter++).padStart(3, '0'),
        EVENT_ID: 'EVT001',
        PARTICIPANT_ID: p.ID,
        DATE: DAY1,
        TIME: time,
        USER_ID: op,
        STATUS: 'HADIR'
      };
      attendance.push(absRecord);

      // Workshop attendance Hari 1
      if (p.WORKSHOP_A == 1) {
        workshopAttendance.push({
          ID: 'WA' + String(waIdCounter++).padStart(3, '0'),
          EVENT_ID: 'EVT001',
          PARTICIPANT_ID: p.ID,
          WORKSHOP_CODE: 'W01',
          DATE: DAY1,
          TIME: randomTime(7, 45, 8, 20),
          USER_ID: op
        });
      }
      if (p.WORKSHOP_B == 1) {
        workshopAttendance.push({
          ID: 'WA' + String(waIdCounter++).padStart(3, '0'),
          EVENT_ID: 'EVT001',
          PARTICIPANT_ID: p.ID,
          WORKSHOP_CODE: 'W02',
          DATE: DAY1,
          TIME: randomTime(12, 45, 13, 20),
          USER_ID: op
        });
      }
    }

    if (attendDay2) {
      day2Attendees.push(p);
      const time = randomTime(7, 15, 8, 50);
      const op = operators[(idx + 1) % 2];
      const absRecord = {
        ATTENDANCE_ID: 'ABS' + String(absIdCounter++).padStart(3, '0'),
        EVENT_ID: 'EVT001',
        PARTICIPANT_ID: p.ID,
        DATE: DAY2,
        TIME: time,
        USER_ID: op,
        STATUS: 'HADIR'
      };
      attendance.push(absRecord);

      // Workshop attendance Hari 2
      if (p.WORKSHOP_C == 1) {
        workshopAttendance.push({
          ID: 'WA' + String(waIdCounter++).padStart(3, '0'),
          EVENT_ID: 'EVT001',
          PARTICIPANT_ID: p.ID,
          WORKSHOP_CODE: 'W03',
          DATE: DAY2,
          TIME: randomTime(7, 40, 8, 25),
          USER_ID: op
        });
      }
    }
  });

  // Urutkan absensi berdasarkan tanggal & jam
  attendance.sort((a, b) => (a.DATE + a.TIME).localeCompare(b.DATE + b.TIME));
  workshopAttendance.sort((a, b) => (a.DATE + a.TIME).localeCompare(b.DATE + b.TIME));

  // Simpan ke db.json
  db.attendance = attendance;
  db.workshopAttendance = workshopAttendance;

  // Log simulasi
  db.logs.push({
    LOG_ID: 'LOG' + String(db.logs.length + 1).padStart(3, '0'),
    TIMESTAMP: '2026-10-18 17:00:00',
    USER_ID: 'USR001',
    ACTION: 'SIMULATION_2_DAYS',
    PARTICIPANT_ID: '',
    DESCRIPTION: `Simulasi absensi 2 hari: ${attendance.length} kehadiran tercatat`
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

  console.log('✓ Data absensi berhasil diterapkan ke data/db.json!');
  console.log(`  - Total Record Absensi Simposium : ${attendance.length} record`);
  console.log(`  - Hadir Hari 1 (${DAY1}) : ${day1Attendees.length} orang (${Math.round(day1Attendees.length/participants.length*100)}%)`);
  console.log(`  - Hadir Hari 2 (${DAY2}) : ${day2Attendees.length} orang (${Math.round(day2Attendees.length/participants.length*100)}%)`);
  console.log(`  - Total Record Absensi Workshop  : ${workshopAttendance.length} record`);

  const bothDays = participants.filter(p => day1Attendees.includes(p) && day2Attendees.includes(p));
  console.log(`  - Hadir KEDUA Hari (Lengkap)     : ${bothDays.length} orang`);

  // Ekspor Laporan Excel
  console.log('\n2. Membuat File Laporan Excel Resmi (Multi-Sheet)...');
  const dbProvider = require('../database/json');
  const reportResult = await dbProvider.getReportData({ type: 'export' });
  const exportData = reportResult.data;

  const wb = XLSX.utils.book_new();

  // 1. Sheet RINGKASAN
  const summaryRows = [
    ['LAPORAN HASIL KEHADIRAN EVENT'],
    ['Event', 'PIT VIII PAPDI Purwokerto 2026'],
    ['Lokasi', 'Java Heritage Hotel Purwokerto'],
    ['Tanggal Pelaksanaan', '17 - 18 Oktober 2026'],
    ['Total Peserta Terdaftar', participants.length],
    ['Total Kehadiran Simposium', attendance.length],
    ['Kehadiran Hari 1 (17 Okt 2026)', day1Attendees.length],
    ['Kehadiran Hari 2 (18 Okt 2026)', day2Attendees.length],
    ['Hadir Kedua Hari (Lengkap)', bothDays.length],
    ['Total Kehadiran Workshop', workshopAttendance.length]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'RINGKASAN');

  // 2. Sheet REKAP KEHADIRAN (Per Hari)
  if (exportData.recap && exportData.recap.length) {
    const wsRecap = XLSX.utils.json_to_sheet(exportData.recap);
    XLSX.utils.book_append_sheet(wb, wsRecap, 'REKAP_KEHADIRAN');
  }

  // 3. Sheet DETAIL ABSENSI
  if (attendance.length) {
    const detailRows = attendance.map(a => {
      const p = participants.find(item => item.ID === a.PARTICIPANT_ID);
      return {
        KODE_ABSEN: a.ATTENDANCE_ID,
        TANGGAL: a.DATE,
        JAM: a.TIME + ' WIB',
        ID_PESERTA: a.PARTICIPANT_ID,
        NAMA_PESERTA: p ? p.NAME : '—',
        NO_HP: p ? p.PHONE : '—',
        CATATAN: p ? p.NOTE : '—',
        OPERATOR: a.USER_ID,
        STATUS: a.STATUS
      };
    });
    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'DETAIL_ABSENSI');
  }

  // 4. Sheet ABSENSI WORKSHOP
  if (workshopAttendance.length) {
    const wsAttRows = workshopAttendance.map(wa => {
      const p = participants.find(item => item.ID === wa.PARTICIPANT_ID);
      const wsName = wa.WORKSHOP_CODE === 'W01' ? 'Workshop A' : (wa.WORKSHOP_CODE === 'W02' ? 'Workshop B' : 'Workshop C');
      return {
        KODE: wa.ID,
        WORKSHOP: wsName,
        TANGGAL: wa.DATE,
        JAM: wa.TIME + ' WIB',
        ID_PESERTA: wa.PARTICIPANT_ID,
        NAMA_PESERTA: p ? p.NAME : '—',
        NO_HP: p ? p.PHONE : '—',
        OPERATOR: wa.USER_ID
      };
    });
    const wsWorkshop = XLSX.utils.json_to_sheet(wsAttRows);
    XLSX.utils.book_append_sheet(wb, wsWorkshop, 'ABSENSI_WORKSHOP');
  }

  // 5. Sheet DAFTAR PESERTA
  if (participants.length) {
    const wsPeserta = XLSX.utils.json_to_sheet(participants);
    XLSX.utils.book_append_sheet(wb, wsPeserta, 'DAFTAR_PESERTA');
  }

  const exportFileName = 'Laporan_Absensi_2_Hari_PIT_VIII_PAPDI_Purwokerto_2026.xlsx';
  const exportPath = path.resolve(process.cwd(), exportFileName);
  XLSX.writeFile(wb, exportPath);

  console.log(`✓ Laporan Excel Berhasil Dibuat:`);
  console.log(`  File: ${exportPath}`);
  console.log('\n===============================================================');
  console.log('✓ SIMULASI 2 HARI & EXPORT LAPORAN SELESAI!');
  console.log('===============================================================\n');
}

run();

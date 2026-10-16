const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Baca data peserta dari data/db.json
const dbPath = path.resolve(__dirname, '../data/db.json');
if (!fs.existsSync(dbPath)) {
  console.error('File db.json tidak ditemukan!');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const rawParticipants = Array.isArray(db.participants) ? db.participants : [];
console.log(`Memuat ${rawParticipants.length} data peserta dari db.json...`);

// Helper untuk membersihkan dan menstandarkan gelar untuk pengurutan alfabet nama asli
function getSortKey(name) {
  if (!name) return '';
  let clean = name.trim();
  // Hilangkan awalan gelar akademik / profesi agar urut nama asli (A - Z)
  clean = clean.replace(/^(prof\.\s*dr\.\s*dr\.|prof\.\s*dr\.|prof\.|dr\.\s*dr\.|dr\.\s*|dr\s+|dr\.|dr|dr\.\s*sp\.an|dr\.\s*siti|dr\.\s*djoni|dr\.\s*diaga|dr\.\s*hendrawan|dr\.\s*rudianto|dr\.\s*lintang|dr\.\s*ria|dr\.\s*jose|dr\.\s*agus|dr\.\s*pranawa|dr\.\s*tantra|dr\.\s*rundito|dr\.\s*lusi)/i, '');
  return clean.trim().toLowerCase();
}

// 2. Siapkan data dengan 2 jenis pengurutan:
// A. Urut Nama Asli (Natural Name A-Z)
const participantsByName = [...rawParticipants].sort((a, b) => {
  const keyA = getSortKey(a.NAME);
  const keyB = getSortKey(b.NAME);
  const cmp = keyA.localeCompare(keyB, 'id', { sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return (a.NAME || '').localeCompare(b.NAME || '', 'id');
});

// B. Urut Teks Literal (Literal A-Z)
const participantsByLiteral = [...rawParticipants].sort((a, b) => {
  return (a.NAME || '').trim().localeCompare((b.NAME || '').trim(), 'id', { sensitivity: 'base' });
});

// C. Panitia, Pembicara, Moderator saja
const committeeParticipants = participantsByName.filter(p => {
  const n = (p.NOTE || '').toLowerCase();
  return n.includes('panitia') || n.includes('moderator') || n.includes('pembicara');
});

console.log(`Total peserta: ${participantsByName.length}`);
console.log(`Peserta panitia/moderator/pembicara: ${committeeParticipants.length}`);

// Helper membuat worksheet tabular yang rapi
function createAttendanceSheet(list, titleNote, mode = 'both') {
  const rows = [];

  // Header Title
  rows.push(['DAFTAR HADIR PESERTA & PANITIA']);
  rows.push(['PIT VIII PAPDI PURWOKERTO 2026']);
  rows.push(['Hotel Java Heritage Purwokerto · 16 - 17 Oktober 2026']);
  rows.push([titleNote || '']);
  rows.push([]); // blank row

  // Table Columns Header
  let headers = [];
  if (mode === 'both') {
    headers = [
      'No',
      'ID Peserta',
      'Nama Lengkap & Gelar',
      'No. WhatsApp / HP',
      'Kategori Tiket',
      'Peran / Catatan Khusus',
      'Kehadiran 16 Oktober 2026 (Jumat)',
      'Kehadiran 17 Oktober 2026 (Sabtu)'
    ];
  } else if (mode === 'day1') {
    headers = [
      'No',
      'ID Peserta',
      'Nama Lengkap & Gelar',
      'No. WhatsApp / HP',
      'Kategori / Peran',
      'Jam Hadir (WIB)',
      'Tanda Tangan 16 Oktober 2026 (Jumat)',
      'Keterangan'
    ];
  } else if (mode === 'day2') {
    headers = [
      'No',
      'ID Peserta',
      'Nama Lengkap & Gelar',
      'No. WhatsApp / HP',
      'Kategori / Peran',
      'Jam Hadir (WIB)',
      'Tanda Tangan 17 Oktober 2026 (Sabtu)',
      'Keterangan'
    ];
  }

  rows.push(headers);

  // Table Data Rows
  list.forEach((p, idx) => {
    const no = idx + 1;
    const phone = p.PHONE ? String(p.PHONE).trim() : '';
    const note = p.NOTE ? String(p.NOTE).trim() : 'Peserta Umum';
    const product = p.PRODUCT ? String(p.PRODUCT).trim() : 'Simposium';

    if (mode === 'both') {
      rows.push([
        no,
        p.ID || '',
        p.NAME || '',
        phone,
        product,
        note,
        '', // Kolom TTD / Presensi 16 Okt
        ''  // Kolom TTD / Presensi 17 Okt
      ]);
    } else if (mode === 'day1' || mode === 'day2') {
      // Signature box numbering (selang-seling 1 di kiri, 2 di kanan)
      const sigNumber = (no % 2 !== 0) ? `${no}. ....................` : `        ${no}. ....................`;
      rows.push([
        no,
        p.ID || '',
        p.NAME || '',
        phone,
        note !== 'Peserta Umum' ? note : product,
        '', // Jam Hadir
        sigNumber, // Tanda Tangan
        '' // Keterangan
      ]);
    }
  });

  // Konversi array ke worksheet SheetJS
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Tentukan lebar kolom yang optimal
  if (mode === 'both') {
    ws['!cols'] = [
      { wch: 6 },   // No
      { wch: 11 },  // ID Peserta
      { wch: 46 },  // Nama Lengkap
      { wch: 18 },  // No HP
      { wch: 22 },  // Kategori Tiket
      { wch: 25 },  // Catatan / Peran
      { wch: 28 },  // Kehadiran 16 Okt
      { wch: 28 }   // Kehadiran 17 Okt
    ];
  } else {
    ws['!cols'] = [
      { wch: 6 },   // No
      { wch: 11 },  // ID Peserta
      { wch: 46 },  // Nama Lengkap
      { wch: 18 },  // No HP
      { wch: 24 },  // Kategori / Peran
      { wch: 16 },  // Jam Hadir
      { wch: 30 },  // Tanda Tangan
      { wch: 20 }   // Keterangan
    ];
  }

  // Set nomor HP dan ID secara eksplisit sebagai teks string
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 5; R <= range.e.r; ++R) {
    // ID cell (col 1)
    const idCellRef = XLSX.utils.encode_cell({ r: R, c: 1 });
    if (ws[idCellRef] && ws[idCellRef].v !== undefined) {
      ws[idCellRef].t = 's';
    }
    // Phone cell (col 3)
    const phoneCellRef = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (ws[phoneCellRef] && ws[phoneCellRef].v !== undefined) {
      ws[phoneCellRef].t = 's';
      ws[phoneCellRef].z = '@';
    }
  }

  return ws;
}

// 3. Buat Workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Daftar Hadir Lengkap 16 & 17 Oktober 2026 (Urut Abjad Nama Asli)
const wsMain = createAttendanceSheet(
  participantsByName,
  'Daftar Hadir Lengkap (16 & 17 Oktober 2026) · Urut Abjad Nama Peserta',
  'both'
);
XLSX.utils.book_append_sheet(wb, wsMain, 'DAFTAR HADIR 16 & 17 OKT');

// Sheet 2: Presensi Hari 1 (Jumat, 16 Oktober 2026) - Format Tanda Tangan Meja
const wsDay1 = createAttendanceSheet(
  participantsByName,
  'Lembar Presensi Meja Registrasi · HARI 1: JUMAT, 16 OKTOBER 2026',
  'day1'
);
XLSX.utils.book_append_sheet(wb, wsDay1, 'PRESENSI 16 OKTOBER 2026');

// Sheet 3: Presensi Hari 2 (Sabtu, 17 Oktober 2026) - Format Tanda Tangan Meja
const wsDay2 = createAttendanceSheet(
  participantsByName,
  'Lembar Presensi Meja Registrasi · HARI 2: SABTU, 17 OKTOBER 2026',
  'day2'
);
XLSX.utils.book_append_sheet(wb, wsDay2, 'PRESENSI 17 OKTOBER 2026');

// Sheet 4: Khusus Panitia, Pembicara & Moderator
const wsCommittee = createAttendanceSheet(
  committeeParticipants,
  'Daftar Hadir Khusus Panitia, Pembicara & Moderator · 16 - 17 Oktober 2026',
  'both'
);
XLSX.utils.book_append_sheet(wb, wsCommittee, 'PANITIA & PEMBICARA');

// Sheet 5: Urut Teks Literal (A - Z berdasarkan teks awal termasuk "dr.")
const wsLiteral = createAttendanceSheet(
  participantsByLiteral,
  'Daftar Hadir (Urut Teks Awalan dr./A-Z Literal)',
  'both'
);
XLSX.utils.book_append_sheet(wb, wsLiteral, 'URUT TEKS LITERAL A-Z');

// Simpan file Excel
const outputFileName = 'Daftar Hadir PIT VIII PAPDI Purwokerto 16-17 Oktober 2026.xlsx';
const outputPath = path.resolve(process.cwd(), outputFileName);
XLSX.writeFile(wb, outputPath);

console.log(`\n✓ Berhasil membuat file Excel daftar hadir:`);
console.log(`  Path: ${outputPath}`);
console.log(`  Ukuran: ${fs.statSync(outputPath).size} bytes`);
console.log(`  Jumlah Peserta: ${participantsByName.length} orang (P001 - P243)`);
console.log(`  Sheets:`);
console.log(`    1. DAFTAR HADIR 16 & 17 OKT (Daftar utama 2 hari berdampingan)`);
console.log(`    2. PRESENSI 16 OKTOBER 2026 (Lembar presensi hari ke-1 siap tanda tangan)`);
console.log(`    3. PRESENSI 17 OKTOBER 2026 (Lembar presensi hari ke-2 siap tanda tangan)`);
console.log(`    4. PANITIA & PEMBICARA (Khusus 38 panitia, pembicara, dan moderator)`);
console.log(`    5. URUT TEKS LITERAL A-Z (Urutan teks alfabetis langsung)`);

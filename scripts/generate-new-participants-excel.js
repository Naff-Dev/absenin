const XLSX = require('e:/project/absenin/node_modules/xlsx');
const path = require('path');
const fs = require('fs');

// Data 12 peserta baru
const newParticipants = [
  {
    noBaru: 1,
    noMaster: 97,
    id: 'P097',
    name: 'Syahrefa Aulia Zahra',
    phone: '081221923748',
    product: 'Simposium',
    sympo: 1,
    wsA: null,
    wsB: null,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 2,
    noMaster: 173,
    id: 'P173',
    name: 'dr. Andrian Purwo Sulistyo, Sp.Ok, HIMA, AIFO-K, OEUK',
    phone: '082242671039',
    product: 'Simposium dan Workshop',
    sympo: 1,
    wsA: null,
    wsB: null,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 3,
    noMaster: 241,
    id: 'P241',
    name: 'Azzahra Dzakiyah',
    phone: '082134092494',
    product: 'Simposium dan Workshop',
    sympo: 1,
    wsA: null,
    wsB: 1,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 4,
    noMaster: 242,
    id: 'P242',
    name: 'M. Usama Royhul Azhar',
    phone: '082323690960',
    product: 'Simposium dan Workshop',
    sympo: 1,
    wsA: null,
    wsB: 1,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 5,
    noMaster: 243,
    id: 'P243',
    name: 'Della Chandra Audina',
    phone: '087760363562',
    product: 'Simposium dan Workshop',
    sympo: 1,
    wsA: null,
    wsB: 1,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 6,
    noMaster: 244,
    id: 'P244',
    name: 'Syawal Nurdianzah',
    phone: '082193355531',
    product: 'Simposium dan Workshop',
    sympo: 1,
    wsA: null,
    wsB: 1,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 7,
    noMaster: 245,
    id: 'P245',
    name: 'Dr. PATOGU IMAN DIMANOTO , MSc, SpPD',
    phone: '',
    product: 'Simposium',
    sympo: 1,
    wsA: null,
    wsB: null,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 8,
    noMaster: 246,
    id: 'P246',
    name: 'dr. Wahyuning Ati Ashari',
    phone: '081231175533',
    product: 'Simposium dan Workshop',
    sympo: 1,
    wsA: null,
    wsB: 1,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 9,
    noMaster: 247,
    id: 'P247',
    name: 'Riana Mahwati',
    phone: '085322647704',
    product: 'Workshop',
    sympo: 0,
    wsA: null,
    wsB: 1,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 10,
    noMaster: 248,
    id: 'P248',
    name: 'Kelvin Aidil Fitra',
    phone: '081271125880',
    product: 'Simposium',
    sympo: 1,
    wsA: null,
    wsB: null,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 11,
    noMaster: 249,
    id: 'P249',
    name: 'JAJANG GOENAWAN BASOEKI',
    phone: '08122705680',
    product: 'Simposium dan Workshop',
    sympo: 1,
    wsA: 1,
    wsB: null,
    wsC: null,
    note: 'Peserta Baru'
  },
  {
    noBaru: 12,
    noMaster: 250,
    id: 'P250',
    name: 'Widya Kartika Rakhmawati',
    phone: '081333556618',
    product: 'Simposium',
    sympo: 1,
    wsA: null,
    wsB: null,
    wsC: null,
    note: 'Peserta Baru'
  }
];

const wb = XLSX.utils.book_new();

// ==========================================
// SHEET 1: REGISTRASI (Format Persis Master Daftar Peserta)
// ==========================================
function buildRegistrasiSheet(list) {
  const rows = [];
  rows.push(['PIT VIII PAPDI Purwokerto 2026']);
  rows.push(['17 - 18 Oktober 2026 | JAVA HERITAGE HOTEL PURWOKERTO']);
  rows.push(['DAFTAR PESERTA BARU (PENAMBAHAN DATA TERBARU)']);
  rows.push([null, null, null, null, null, 'WORKSHOP', null, null, null]);
  rows.push(['NO', 'ID PESERTA', 'NAME', 'PHONE', 'PRODUCT ', 'SYMPO', 'A', 'B', 'C', 'KETERANGAN']);

  list.forEach(p => {
    rows.push([
      p.noBaru,
      p.id,
      p.name,
      p.phone,
      p.product,
      p.sympo,
      p.wsA,
      p.wsB,
      p.wsC,
      `No Master: ${p.noMaster}`
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merge cell untuk tulisan WORKSHOP di atas kolom A, B, C (kolom F, G, H)
  ws['!merges'] = [
    { s: { r: 3, c: 6 }, e: { r: 3, c: 8 } }
  ];

  // Lebar kolom
  ws['!cols'] = [
    { wch: 6 },   // NO
    { wch: 12 },  // ID PESERTA
    { wch: 48 },  // NAME
    { wch: 18 },  // PHONE
    { wch: 25 },  // PRODUCT
    { wch: 8 },   // SYMPO
    { wch: 6 },   // A
    { wch: 6 },   // B
    { wch: 6 },   // C
    { wch: 18 }   // KETERANGAN
  ];

  // Format teks string untuk ID dan Phone
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 5; R <= range.e.r; ++R) {
    const idRef = XLSX.utils.encode_cell({ r: R, c: 1 });
    if (ws[idRef]) ws[idRef].t = 's';
    const phoneRef = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (ws[phoneRef]) {
      ws[phoneRef].t = 's';
      ws[phoneRef].z = '@';
    }
  }

  return ws;
}

// ==========================================
// SHEET 2: REGISTRASI (Format Asli 8 Kolom Master)
// ==========================================
function buildExact8ColsSheet(list) {
  const rows = [];
  rows.push(['PIT VIII PAPDI Purwokerto 2026']);
  rows.push(['17 - 18 Oktober 2026 | JAVA HERITAGE HOTEL PURWOKERTO']);
  rows.push([]);
  rows.push([null, null, null, null, null, 'WORKSHOP', null, null]);
  rows.push(['NO', 'NAME', 'PHONE', 'PRODUCT ', 'SYMPO', 'A', 'B', 'C']);

  list.forEach(p => {
    rows.push([
      p.noBaru,
      p.name,
      p.phone,
      p.product,
      p.sympo,
      p.wsA,
      p.wsB,
      p.wsC
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 3, c: 5 }, e: { r: 3, c: 7 } }
  ];

  ws['!cols'] = [
    { wch: 6 },   // NO
    { wch: 48 },  // NAME
    { wch: 18 },  // PHONE
    { wch: 25 },  // PRODUCT
    { wch: 8 },   // SYMPO
    { wch: 6 },   // A
    { wch: 6 },   // B
    { wch: 6 }    // C
  ];

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 5; R <= range.e.r; ++R) {
    const phoneRef = XLSX.utils.encode_cell({ r: R, c: 2 });
    if (ws[phoneRef]) {
      ws[phoneRef].t = 's';
      ws[phoneRef].z = '@';
    }
  }

  return ws;
}

// ==========================================
// SHEET 3: LEMBAR PRESENSI TANDA TANGAN MEJA
// ==========================================
function buildAttendanceSheet(list) {
  const rows = [];
  rows.push(['DAFTAR HADIR PESERTA BARU']);
  rows.push(['PIT VIII PAPDI PURWOKERTO 2026']);
  rows.push(['Hotel Java Heritage Purwokerto · 16 - 17 Oktober 2026']);
  rows.push(['Lembar Presensi Khusus 12 Peserta Penambahan Terbaru']);
  rows.push([]);
  rows.push([
    'No',
    'ID Peserta',
    'Nama Lengkap & Gelar',
    'No. WhatsApp / HP',
    'Kategori Tiket',
    'Jam Hadir',
    'Tanda Tangan 16 Okt',
    'Tanda Tangan 17 Okt',
    'Keterangan'
  ]);

  list.forEach((p, idx) => {
    const no = idx + 1;
    const sig1 = (no % 2 !== 0) ? `${no}. ..........` : `       ${no}. ..........`;
    const sig2 = (no % 2 !== 0) ? `${no}. ..........` : `       ${no}. ..........`;
    rows.push([
      no,
      p.id,
      p.name,
      p.phone,
      p.product,
      '',
      sig1,
      sig2,
      `No Master: ${p.noMaster}`
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },   // No
    { wch: 12 },  // ID Peserta
    { wch: 48 },  // Nama
    { wch: 18 },  // HP
    { wch: 25 },  // Kategori
    { wch: 12 },  // Jam Hadir
    { wch: 22 },  // TTD 16
    { wch: 22 },  // TTD 17
    { wch: 18 }   // Keterangan
  ];

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 5; R <= range.e.r; ++R) {
    const idRef = XLSX.utils.encode_cell({ r: R, c: 1 });
    if (ws[idRef]) ws[idRef].t = 's';
    const phoneRef = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (ws[phoneRef]) {
      ws[phoneRef].t = 's';
      ws[phoneRef].z = '@';
    }
  }

  return ws;
}

// Tambahkan sheets ke workbook
const ws1 = buildRegistrasiSheet(newParticipants);
XLSX.utils.book_append_sheet(wb, ws1, 'REGISTRASI PESERTA BARU');

const ws2 = buildExact8ColsSheet(newParticipants);
XLSX.utils.book_append_sheet(wb, ws2, 'FORMAT PERSIS DAFTAR PESERTA');

const ws3 = buildAttendanceSheet(newParticipants);
XLSX.utils.book_append_sheet(wb, ws3, 'LEMBAR PRESENSI PESERTA BARU');

// Simpan file
const fileName = 'daftar peserta baru.xlsx';
const filePath = path.resolve(process.cwd(), fileName);
XLSX.writeFile(wb, filePath);

console.log('✓ File Excel berhasil dibuat:', filePath);
console.log('  Ukuran:', fs.statSync(filePath).size, 'bytes');

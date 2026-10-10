const XLSX = require('xlsx');
const path = require('path');

const file = path.join(__dirname, '..', 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx');
const wb = XLSX.readFile(file);
const ws = wb.Sheets['REGISTRASI'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Total raw rows:', rows.length);

const summary = {
  batal: [],
  voucher: [],
  otherNotes: {},
  phoneCount: 0,
  emptyPhone: 0,
  totalParticipants: 0
};

for (let i = 5; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r[1] || typeof r[1] !== 'string' || !r[1].trim()) continue;
  summary.totalParticipants++;
  const name = r[1].trim();
  const phone = r[2] ? String(r[2]).trim() : '';
  const note = r[8] ? String(r[8]).trim() : '';

  if (phone) summary.phoneCount++;
  else summary.emptyPhone++;

  if (note.toUpperCase().includes('BATAL')) {
    summary.batal.push({ row: i + 1, no: r[0], name, phone, note });
  } else if (note.toLowerCase().includes('voucher')) {
    summary.voucher.push({ row: i + 1, no: r[0], name, phone, note });
  } else {
    summary.otherNotes[note] = (summary.otherNotes[note] || 0) + 1;
  }
}

console.log('Total valid rows with name:', summary.totalParticipants);
console.log('With phone:', summary.phoneCount, 'Without phone:', summary.emptyPhone);
console.log('BATAL count:', summary.batal.length);
console.log('BATAL list:', JSON.stringify(summary.batal, null, 2));
console.log('Voucher count:', summary.voucher.length);
console.log('Voucher list:', JSON.stringify(summary.voucher, null, 2));
console.log('Other notes:', summary.otherNotes);

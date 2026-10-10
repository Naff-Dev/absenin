/**
 * Server Utilities
 * Timezone handling and formatting for Asia/Jakarta
 */

const TIMEZONE = 'Asia/Jakarta';

function getServerDate() {
  const now = new Date();
  const jakartaDate = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return jakartaDate;
}

function formatDate(date) {
  if (typeof date === 'string') date = new Date(date);
  const d = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date) {
  if (typeof date === 'string') date = new Date(date);
  const d = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDateIndonesian(dateStr) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  const day = parseInt(parts[2], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  return `${String(day).padStart(2, '0')} ${months[monthIndex]} ${year}`;
}

function generateId(prefix, existingIds = []) {
  let maxNum = 0;
  existingIds.forEach(id => {
    if (id && id.startsWith(prefix)) {
      const num = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

module.exports = { getServerDate, formatDate, formatTime, formatDateIndonesian, generateId, TIMEZONE };

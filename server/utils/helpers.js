/**
 * Server Utilities
 * Timezone handling and formatting for Asia/Jakarta
 */

const TIMEZONE = 'Asia/Jakarta';

function getServerDate() {
  return new Date();
}

function formatDate(date) {
  const d = date ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date) : new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(d);
}

function formatTime(date) {
  const d = date ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date) : new Date();
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
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

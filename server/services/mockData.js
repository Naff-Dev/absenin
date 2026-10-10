/**
 * In-Memory Mock Data Store
 * Used during local development and testing when APPS_SCRIPT_URL is not yet connected to live Google Sheet
 */

const { getServerDate, formatDate, formatTime } = require('../utils/helpers');

// Seed data
let events = [
  {
    EVENT_ID: 'EVT001',
    EVENT_NAME: 'PIT VIII PAPDI Purwokerto 2026',
    START_DATE: '2026-03-01',
    END_DATE: '2026-03-03',
    LOCATION: 'Purwokerto',
    STATUS: 'ACTIVE'
  }
];

let panitia = [
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
  }
];

let workshops = [
  {
    CODE: 'W01',
    NAME: 'Workshop USG Abdomen',
    DATE: '2026-03-01',
    TIME: '08:00 - 12:00',
    ROOM: 'Ruang A',
    QUOTA: 50,
    STATUS: 'ACTIVE'
  },
  {
    CODE: 'W02',
    NAME: 'Workshop EKG Lanjut',
    DATE: '2026-03-01',
    TIME: '13:00 - 17:00',
    ROOM: 'Ruang B',
    QUOTA: 50,
    STATUS: 'ACTIVE'
  },
  {
    CODE: 'W03',
    NAME: 'Workshop Terapi Nutrisi',
    DATE: '2026-03-02',
    TIME: '08:00 - 12:00',
    ROOM: 'Ruang C',
    QUOTA: 40,
    STATUS: 'ACTIVE'
  }
];

let participants = [
  {
    ID: 'P001',
    NO: 1,
    NAME: 'dr. Leo Pratama, Sp.PD',
    PHONE: '081234567890',
    INSTITUTION: 'RSUD Margono Soekarjo',
    EMAIL: 'leo@example.com',
    PRODUCT: 'Simposium + Workshop A',
    SYMPO: 1,
    WORKSHOP_A: 1,
    WORKSHOP_B: 0,
    WORKSHOP_C: 0,
    SOURCE: 'IMPORT',
    CREATED_AT: '2026-03-01 07:00:00',
    UPDATED_AT: '2026-03-01 07:00:00'
  },
  {
    ID: 'P002',
    NO: 2,
    NAME: 'dr. Sarah Wijaya, Sp.PD',
    PHONE: '081298765432',
    INSTITUTION: 'RS Hermina Purwokerto',
    EMAIL: 'sarah@example.com',
    PRODUCT: 'Simposium Only',
    SYMPO: 1,
    WORKSHOP_A: 0,
    WORKSHOP_B: 0,
    WORKSHOP_C: 0,
    SOURCE: 'IMPORT',
    CREATED_AT: '2026-03-01 07:00:00',
    UPDATED_AT: '2026-03-01 07:00:00'
  },
  {
    ID: 'P003',
    NO: 3,
    NAME: 'dr. Budi Santoso',
    PHONE: '081345678901',
    INSTITUTION: 'Klinik Utama Sehat',
    EMAIL: 'budi@example.com',
    PRODUCT: 'Simposium + Workshop B',
    SYMPO: 1,
    WORKSHOP_A: 0,
    WORKSHOP_B: 1,
    WORKSHOP_C: 0,
    SOURCE: 'IMPORT',
    CREATED_AT: '2026-03-01 07:00:00',
    UPDATED_AT: '2026-03-01 07:00:00'
  }
];

let attendance = [];
let workshopAttendance = [];
let logs = [];

function init() {
  return {
    success: true,
    message: 'Inisialisasi seluruh sheet berhasil!',
    details: [
      'Sheet EVENT: Terinisialisasi',
      'Sheet PESERTA: Terinisialisasi',
      'Sheet WORKSHOP: Terinisialisasi',
      'Sheet ABSENSI: Terinisialisasi',
      'Sheet ABSENSI_WORKSHOP: Terinisialisasi',
      'Sheet PANITIA: Terinisialisasi',
      'Sheet LOG: Terinisialisasi'
    ]
  };
}

function resetData() {
  attendance = [];
  workshopAttendance = [];
  logs = [];
}

function getEvent() {
  const active = events.find(e => e.STATUS === 'ACTIVE');
  return { success: true, data: active || events[0] };
}

function getParticipants() {
  return { success: true, data: [...participants] };
}

function getParticipantById(id) {
  const found = participants.find(p => p.ID === id);
  if (!found) {
    return { success: false, message: 'Peserta tidak ditemukan.', code: 'NOT_FOUND' };
  }
  return { success: true, data: found };
}

function addParticipant(data) {
  const maxNum = participants.reduce((max, p) => {
    if (p.ID && typeof p.ID === 'string') {
      const num = parseInt(p.ID.replace('P', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'P' + String(maxNum + 1).padStart(3, '0');
  const newNo = participants.length + 1;
  const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());

  const participant = {
    ID: newId,
    NO: newNo,
    NAME: data.name,
    PHONE: data.phone || '',
    INSTITUTION: data.institution || '',
    EMAIL: data.email || '',
    PRODUCT: data.product || '',
    SYMPO: data.sympo ? 1 : 0,
    WORKSHOP_A: data.workshopA ? 1 : 0,
    WORKSHOP_B: data.workshopB ? 1 : 0,
    WORKSHOP_C: data.workshopC ? 1 : 0,
    NOTE: data.note || '',
    SOURCE: data.source || 'MANUAL',
    CREATED_AT: now,
    UPDATED_AT: now
  };

  participants.push(participant);
  return { success: true, data: participant };
}

function validateLogin(username, password) {
  const user = panitia.find(p => p.USERNAME === username && String(p.PASSWORD) === String(password));
  if (!user) {
    return { success: false, message: 'Username atau password salah.', code: 'INVALID_CREDENTIALS' };
  }
  if (user.STATUS !== 'ACTIVE') {
    return { success: false, message: 'Akun tidak aktif.', code: 'ACCOUNT_INACTIVE' };
  }
  return {
    success: true,
    data: {
      USER_ID: user.USER_ID,
      NAME: user.NAME,
      USERNAME: user.USERNAME,
      STATUS: user.STATUS
    }
  };
}

function checkIn(data) {
  const duplicate = attendance.find(a =>
    a.EVENT_ID === data.eventId &&
    a.PARTICIPANT_ID === data.participantId &&
    a.DATE === data.date
  );

  if (duplicate) {
    return {
      success: false,
      message: 'Peserta sudah check-in hari ini.',
      code: 'ALREADY_CHECKED_IN',
      data: {
        time: duplicate.TIME,
        userId: duplicate.USER_ID
      }
    };
  }

  const maxNum = attendance.reduce((max, a) => {
    if (a.ATTENDANCE_ID && typeof a.ATTENDANCE_ID === 'string') {
      const num = parseInt(a.ATTENDANCE_ID.replace('ABS', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'ABS' + String(maxNum + 1).padStart(3, '0');
  const record = {
    ATTENDANCE_ID: newId,
    EVENT_ID: data.eventId,
    PARTICIPANT_ID: data.participantId,
    DATE: data.date,
    TIME: data.time,
    USER_ID: data.userId,
    STATUS: 'HADIR'
  };

  attendance.push(record);
  return { success: true, data: record };
}

function getAttendanceToday(eventId, date) {
  const today = attendance.filter(a => a.EVENT_ID === eventId && a.DATE === date);
  return { success: true, data: today };
}

function getAttendanceHistory(params) {
  let list = [...attendance];
  if (params.eventId) list = list.filter(a => a.EVENT_ID === params.eventId);
  if (params.date) list = list.filter(a => a.DATE === params.date);
  if (params.startDate) list = list.filter(a => a.DATE >= params.startDate);
  if (params.endDate) list = list.filter(a => a.DATE <= params.endDate);
  if (params.participantId) list = list.filter(a => a.PARTICIPANT_ID === params.participantId);

  list.sort((a, b) => {
    if (a.DATE !== b.DATE) return b.DATE.localeCompare(a.DATE);
    return (b.TIME || '').localeCompare(a.TIME || '');
  });

  return { success: true, data: list };
}

function getWorkshops() {
  return { success: true, data: workshops.filter(w => w.STATUS === 'ACTIVE') };
}

function workshopCheckIn(data) {
  const duplicate = workshopAttendance.find(a =>
    a.EVENT_ID === data.eventId &&
    a.PARTICIPANT_ID === data.participantId &&
    a.WORKSHOP_CODE === data.workshopCode &&
    a.DATE === data.date
  );

  if (duplicate) {
    return {
      success: false,
      message: 'Peserta sudah check-in workshop ini hari ini.',
      code: 'ALREADY_CHECKED_IN'
    };
  }

  const maxNum = workshopAttendance.reduce((max, a) => {
    if (a.ID && typeof a.ID === 'string') {
      const num = parseInt(a.ID.replace('WA', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'WA' + String(maxNum + 1).padStart(3, '0');
  const record = {
    ID: newId,
    EVENT_ID: data.eventId,
    PARTICIPANT_ID: data.participantId,
    WORKSHOP_CODE: data.workshopCode,
    DATE: data.date,
    TIME: data.time,
    USER_ID: data.userId
  };

  workshopAttendance.push(record);
  return { success: true, data: record };
}

function getWorkshopAttendance(params) {
  let list = [...workshopAttendance];
  if (params.eventId) list = list.filter(a => a.EVENT_ID === params.eventId);
  if (params.date) list = list.filter(a => a.DATE === params.date);
  if (params.workshopCode) list = list.filter(a => a.WORKSHOP_CODE === params.workshopCode);
  return { success: true, data: list };
}

function getReportData(params) {
  const type = params.type || 'daily';

  if (type === 'export') {
    const dates = [...new Set(attendance.map(a => a.DATE))].sort();
    const recap = participants.map(p => {
      const row = { NO: p.NO, NAME: p.NAME, INSTITUTION: p.INSTITUTION };
      dates.forEach(date => {
        const found = attendance.find(a => a.PARTICIPANT_ID === p.ID && a.DATE === date);
        row[date] = found ? '✓' : '-';
      });
      row['TOTAL'] = dates.filter(date =>
        attendance.find(a => a.PARTICIPANT_ID === p.ID && a.DATE === date)
      ).length;
      return row;
    });

    return {
      success: true,
      data: {
        summary: {
          eventName: events[0].EVENT_NAME,
          totalParticipants: participants.length,
          totalAttendance: attendance.length,
          totalWorkshops: workshopAttendance.length
        },
        participants: [...participants],
        attendance: [...attendance],
        workshopAttendance: [...workshopAttendance],
        recap,
        panitia: panitia.map(p => ({ USER_ID: p.USER_ID, NAME: p.NAME, USERNAME: p.USERNAME, STATUS: p.STATUS })),
        logs: [...logs]
      }
    };
  }

  let list = [...attendance];
  if (params.eventId) list = list.filter(a => a.EVENT_ID === params.eventId);
  if (params.date) list = list.filter(a => a.DATE === params.date);
  if (params.startDate) list = list.filter(a => a.DATE >= params.startDate);
  if (params.endDate) list = list.filter(a => a.DATE <= params.endDate);

  const enriched = list.map(a => {
    const p = participants.find(p => p.ID === a.PARTICIPANT_ID);
    return {
      ...a,
      PARTICIPANT_NAME: p ? p.NAME : '',
      INSTITUTION: p ? p.INSTITUTION : ''
    };
  });

  return { success: true, data: enriched };
}

function addLog(data) {
  const maxNum = logs.reduce((max, l) => {
    if (l.LOG_ID && typeof l.LOG_ID === 'string') {
      const num = parseInt(l.LOG_ID.replace('LOG', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'LOG' + String(maxNum + 1).padStart(3, '0');
  const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());

  logs.push({
    LOG_ID: newId,
    TIMESTAMP: now,
    USER_ID: data.userId || '',
    ACTION: data.action || '',
    PARTICIPANT_ID: data.participantId || '',
    DESCRIPTION: data.description || ''
  });

  return { success: true };
}

module.exports = {
  getEvent,
  getParticipants,
  getParticipantById,
  addParticipant,
  validateLogin,
  checkIn,
  getAttendanceToday,
  getAttendanceHistory,
  getWorkshops,
  workshopCheckIn,
  getWorkshopAttendance,
  getReportData,
  addLog,
  init,
  resetData
};

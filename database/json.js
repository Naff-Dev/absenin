/**
 * JSON Local Database Provider
 * Stores and manages all data in a local JSON file (data/db.json).
 * Ideal for local development, offline mode, and testing.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { getServerDate, formatDate, formatTime } = require('../server/utils/helpers');

const DEFAULT_DB_PATH = './data/db.json';

function getDbPath() {
  const envPath = process.env.JSON_DB_PATH || DEFAULT_DB_PATH;
  return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
}

// In-memory cache of JSON DB
let dbCache = null;

/**
 * Read real participants from Excel file if available
 */
function loadSeedParticipantsFromExcel() {
  let excelPath = path.resolve(process.cwd(), 'daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx');
  if (!fs.existsSync(excelPath)) {
    excelPath = path.resolve(process.cwd(), 'docs/daftar peserta PIT VIII PAPDI Purwokerto (1).xlsx');
  }
  if (!fs.existsSync(excelPath)) {
    excelPath = path.resolve(process.cwd(), 'docs/daftar peserta PIT VIII PAPDI Purwokerto.xlsx');
  }

  if (fs.existsSync(excelPath)) {
    try {
      const wb = XLSX.readFile(excelPath);
      const sheet = wb.Sheets['REGISTRASI'];
      if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const rawRows = rows.slice(5).filter(r => r && r[1] && typeof r[1] === 'string' && r[1].trim());
        const participantRows = rawRows.filter(r => {
          const note = r[8] ? String(r[8]).trim() : '';
          return !note.toUpperCase().includes('BATAL');
        });
        const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());

        return participantRows.map((r, i) => {
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
            CREATED_AT: now,
            UPDATED_AT: now
          };
        });
      }
    } catch (err) {
      console.warn('[JSON DB] Gagal membaca seed peserta dari Excel:', err.message);
    }
  }

  // Fallback seed participants
  return [
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
}


/**
 * Generate default seed database
 */
function createDefaultDb() {
  return {
    events: [
      {
        EVENT_ID: 'EVT001',
        EVENT_NAME: 'PIT VIII PAPDI Purwokerto 2026',
        START_DATE: '2026-03-01',
        END_DATE: '2026-03-03',
        LOCATION: 'Purwokerto',
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
        DATE: '2026-03-01',
        TIME: '08:00 - 12:00',
        ROOM: 'Ruang A',
        QUOTA: 50,
        STATUS: 'ACTIVE'
      },
      {
        CODE: 'W02',
        NAME: 'BEDSIDE ULTRASOUND IN CRITICAL CARE',
        DATE: '2026-03-01',
        TIME: '13:00 - 17:00',
        ROOM: 'Ruang B',
        QUOTA: 50,
        STATUS: 'ACTIVE'
      },
      {
        CODE: 'W03',
        NAME: 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS',
        DATE: '2026-03-02',
        TIME: '08:00 - 12:00',
        ROOM: 'Ruang C',
        QUOTA: 40,
        STATUS: 'ACTIVE'
      }
    ],
    participants: loadSeedParticipantsFromExcel(),
    attendance: [],
    workshopAttendance: [],
    logs: []
  };
}

/**
 * Read DB from disk into memory cache
 */
function readDb() {
  if (dbCache) return dbCache;

  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    const defaultData = createDefaultDb();
    saveDb(defaultData);
    dbCache = defaultData;
    return dbCache;
  }

  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    dbCache = JSON.parse(raw);
    return dbCache;
  } catch (err) {
    console.error('[JSON DB] Gagal membaca file JSON:', err.message);
    const defaultData = createDefaultDb();
    saveDb(defaultData);
    dbCache = defaultData;
    return dbCache;
  }
}

/**
 * Save DB to disk atomically
 */
function saveDb(data) {
  dbCache = data;
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${dbPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, dbPath);
}

// --- Provider Methods ---

async function init() {
  const db = readDb();
  return {
    success: true,
    message: 'Inisialisasi JSON Database lokal berhasil!',
    details: [
      `Database File: ${getDbPath()}`,
      `Event: ${db.events.length} data`,
      `Peserta: ${db.participants.length} data`,
      `Workshop: ${db.workshops.length} data`,
      `Absensi: ${db.attendance.length} data`,
      `Absensi Workshop: ${db.workshopAttendance.length} data`,
      `Panitia: ${db.panitia.length} data`,
      `Log: ${db.logs.length} data`
    ]
  };
}

async function initSpreadsheet() {
  return init();
}

async function getEvent() {
  const db = readDb();
  const active = db.events.find(e => e.STATUS === 'ACTIVE');
  return { success: true, data: active || db.events[0] || null };
}

async function getParticipants() {
  const db = readDb();
  return { success: true, data: [...db.participants] };
}

async function getParticipantById(id) {
  const db = readDb();
  const found = db.participants.find(p => p.ID === id);
  if (!found) {
    return { success: false, message: 'Peserta tidak ditemukan.', code: 'NOT_FOUND' };
  }
  return { success: true, data: found };
}

async function addParticipant(data) {
  const db = readDb();
  const maxNum = db.participants.reduce((max, p) => {
    if (p.ID && typeof p.ID === 'string') {
      const num = parseInt(p.ID.replace('P', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'P' + String(maxNum + 1).padStart(3, '0');
  const newNo = db.participants.length + 1;
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

  db.participants.push(participant);
  saveDb(db);

  return { success: true, data: participant };
}

async function updateParticipant(id, data) {
  const db = readDb();
  const index = (db.participants || []).findIndex(p => p.ID === id);
  if (index === -1) {
    return { success: false, message: 'Peserta tidak ditemukan.', code: 'NOT_FOUND' };
  }

  const existing = db.participants[index];
  const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());

  const updated = {
    ...existing,
    NAME: data.name !== undefined ? data.name.trim() : existing.NAME,
    PHONE: data.phone !== undefined ? (data.phone || '').trim() : existing.PHONE,
    INSTITUTION: data.institution !== undefined ? (data.institution || '').trim() : existing.INSTITUTION,
    EMAIL: data.email !== undefined ? (data.email || '').trim() : existing.EMAIL,
    PRODUCT: data.product !== undefined ? (data.product || '').trim() : existing.PRODUCT,
    NOTE: data.note !== undefined ? (data.note || '').trim() : existing.NOTE,
    NO: (data.no !== undefined && data.no !== null && data.no !== '') ? Number(data.no) : existing.NO,
    SYMPO: data.sympo !== undefined ? (data.sympo ? 1 : 0) : existing.SYMPO,
    WORKSHOP_A: (data.workshopA !== undefined ? (data.workshopA ? 1 : 0) : (data.workshop_a !== undefined ? (data.workshop_a ? 1 : 0) : existing.WORKSHOP_A)),
    WORKSHOP_B: (data.workshopB !== undefined ? (data.workshopB ? 1 : 0) : (data.workshop_b !== undefined ? (data.workshop_b ? 1 : 0) : existing.WORKSHOP_B)),
    WORKSHOP_C: (data.workshopC !== undefined ? (data.workshopC ? 1 : 0) : (data.workshop_c !== undefined ? (data.workshop_c ? 1 : 0) : existing.WORKSHOP_C)),
    UPDATED_AT: now
  };

  db.participants[index] = updated;
  saveDb(db);

  return { success: true, data: updated };
}

async function deleteParticipant(id) {
  const db = readDb();
  const initCount = (db.participants || []).length;
  db.participants = (db.participants || []).filter(p => p.ID !== id);
  db.attendance = (db.attendance || []).filter(a => a.PARTICIPANT_ID !== id);
  if (db.workshopAttendance) {
    db.workshopAttendance = db.workshopAttendance.filter(a => a.PARTICIPANT_ID !== id);
  }

  if (db.participants.length < initCount) {
    saveDb(db);
    return { success: true, message: 'Peserta berhasil dihapus.' };
  }
  return { success: false, message: 'Peserta tidak ditemukan.', code: 'NOT_FOUND' };
}

async function validateLogin(username, password) {
  const db = readDb();
  const user = db.panitia.find(p => p.USERNAME === username && String(p.PASSWORD) === String(password));
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

async function checkIn(data) {
  const db = readDb();
  const duplicate = db.attendance.find(a =>
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

  const maxNum = db.attendance.reduce((max, a) => {
    if (a.ATTENDANCE_ID && typeof a.ATTENDANCE_ID === 'string') {
      const num = parseInt(a.ATTENDANCE_ID.replace('ABS', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const participant = (db.participants || []).find(p => p.ID === data.participantId);

  const newId = 'ABS' + String(maxNum + 1).padStart(3, '0');
  const record = {
    ATTENDANCE_ID: newId,
    EVENT_ID: data.eventId,
    PARTICIPANT_ID: data.participantId,
    PARTICIPANT_NAME: participant ? participant.NAME : '',
    INSTITUTION: participant ? participant.INSTITUTION : '',
    PHONE: participant ? participant.PHONE : '',
    NOTE: participant ? participant.NOTE : '',
    DATE: data.date,
    TIME: data.time,
    USER_ID: data.userId,
    STATUS: 'HADIR'
  };

  db.attendance.push(record);
  saveDb(db);

  return { success: true, data: record };
}

async function getAttendanceToday(eventId, date) {
  const db = readDb();
  const pMap = new Map();
  (db.participants || []).forEach(p => pMap.set(p.ID, p));

  const today = (db.attendance || [])
    .filter(a => a.EVENT_ID === eventId && a.DATE === date)
    .map(a => {
      const p = pMap.get(a.PARTICIPANT_ID);
      return {
        ...a,
        PARTICIPANT_NAME: p ? p.NAME : '',
        INSTITUTION: p ? p.INSTITUTION : '',
        PHONE: p ? p.PHONE : '',
        NOTE: p ? p.NOTE : ''
      };
    });

  return { success: true, data: today };
}

async function getAttendanceHistory(params = {}) {
  const db = readDb();
  const pMap = new Map();
  (db.participants || []).forEach(p => pMap.set(p.ID, p));

  let list = (db.attendance || []).map(a => {
    const p = pMap.get(a.PARTICIPANT_ID);
    return {
      ...a,
      PARTICIPANT_NAME: p ? p.NAME : '',
      INSTITUTION: p ? p.INSTITUTION : '',
      PHONE: p ? p.PHONE : '',
      NOTE: p ? p.NOTE : ''
    };
  });

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

async function deleteAttendance(identifier, options = {}) {
  const db = readDb();
  const initialLen = db.attendance.length;

  if (options.byParticipant || (identifier && identifier.startsWith('P') && options.date)) {
    db.attendance = db.attendance.filter(a => {
      if (a.PARTICIPANT_ID === identifier) {
        if (!options.date || a.DATE === options.date) return false;
      }
      return true;
    });
  } else {
    db.attendance = db.attendance.filter(a => a.ATTENDANCE_ID !== identifier);
  }

  const deletedCount = initialLen - db.attendance.length;
  saveDb(db);

  return {
    success: true,
    message: 'Data absensi berhasil dibatalkan / dihapus.',
    deletedCount
  };
}

async function updateAttendance(attendanceId, data) {
  const db = readDb();
  const index = (db.attendance || []).findIndex(a => a.ATTENDANCE_ID === attendanceId);
  if (index === -1) {
    return { success: false, message: 'Data absensi tidak ditemukan.', code: 'NOT_FOUND' };
  }

  const existing = db.attendance[index];
  const updated = {
    ...existing,
    TIME: data.time !== undefined ? data.time : existing.TIME,
    DATE: data.date !== undefined ? data.date : existing.DATE,
    STATUS: data.status !== undefined ? data.status : existing.STATUS,
    USER_ID: data.userId !== undefined ? data.userId : existing.USER_ID
  };

  db.attendance[index] = updated;
  saveDb(db);

  return { success: true, data: updated };
}

async function getWorkshops() {
  const db = readDb();
  return { success: true, data: db.workshops.filter(w => w.STATUS === 'ACTIVE') };
}

async function workshopCheckIn(data) {
  const db = readDb();
  const duplicate = db.workshopAttendance.find(a =>
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

  const maxNum = db.workshopAttendance.reduce((max, a) => {
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

  db.workshopAttendance.push(record);
  saveDb(db);

  return { success: true, data: record };
}

async function getWorkshopAttendance(params = {}) {
  const db = readDb();
  let list = [...db.workshopAttendance];

  if (params.eventId) list = list.filter(a => a.EVENT_ID === params.eventId);
  if (params.date) list = list.filter(a => a.DATE === params.date);
  if (params.workshopCode) list = list.filter(a => a.WORKSHOP_CODE === params.workshopCode);

  return { success: true, data: list };
}

async function getReportData(params = {}) {
  const db = readDb();
  const type = params.type || 'daily';

  if (type === 'export') {
    const dates = [...new Set(db.attendance.map(a => a.DATE))].sort();
    const recap = db.participants.map(p => {
      const row = { ID: p.ID, NO: p.NO, NAME: p.NAME, PHONE: p.PHONE || '', NOTE: p.NOTE || '', INSTITUTION: p.INSTITUTION || '' };
      dates.forEach(date => {
        const found = db.attendance.find(a => a.PARTICIPANT_ID === p.ID && a.DATE === date);
        row[date] = found ? '✓' : '-';
      });
      row['TOTAL'] = dates.filter(date =>
        db.attendance.find(a => a.PARTICIPANT_ID === p.ID && a.DATE === date)
      ).length;
      return row;
    });

    return {
      success: true,
      data: {
        summary: {
          eventName: db.events[0]?.EVENT_NAME || 'PIT VIII PAPDI Purwokerto 2026',
          totalParticipants: db.participants.length,
          totalAttendance: db.attendance.length,
          totalWorkshops: db.workshopAttendance.length
        },
        participants: [...db.participants],
        attendance: [...db.attendance],
        workshopAttendance: [...db.workshopAttendance],
        recap,
        panitia: db.panitia.map(p => ({
          USER_ID: p.USER_ID,
          NAME: p.NAME,
          USERNAME: p.USERNAME,
          STATUS: p.STATUS
        })),
        logs: [...db.logs]
      }
    };
  }

  if (type === 'participants') {
    const checkedMap = new Map();
    db.attendance.forEach(a => checkedMap.set(a.PARTICIPANT_ID, a));

    const list = db.participants.map(p => {
      const att = checkedMap.get(p.ID);
      return {
        ...p,
        ATTENDANCE_STATUS: att ? 'HADIR' : 'BELUM HADIR',
        CHECKIN_TIME: att ? att.TIME : null,
        CHECKIN_DATE: att ? att.DATE : null
      };
    });
    return { success: true, data: list };
  }

  if (type === 'recap') {
    const dates = [...new Set(db.attendance.map(a => a.DATE))].sort();
    const recap = db.participants.map(p => {
      const userAtts = db.attendance.filter(a => a.PARTICIPANT_ID === p.ID);
      const isPresent = userAtts.length > 0;
      return {
        ID: p.ID,
        NO: p.NO,
        NAME: p.NAME,
        INSTITUTION: p.INSTITUTION || '—',
        STATUS: isPresent ? 'HADIR' : 'BELUM HADIR',
        TOTAL_HADIR: userAtts.length,
        DATES_ATTENDED: userAtts.map(a => a.DATE).join(', ') || '—',
        LAST_TIME: userAtts[userAtts.length - 1]?.TIME || '—'
      };
    });
    return { success: true, data: recap };
  }

  if (type === 'panitia') {
    const panitiaStats = db.panitia.map(u => {
      const checkins = db.attendance.filter(a => a.USER_ID === u.USER_ID);
      return {
        USER_ID: u.USER_ID,
        NAME: u.NAME,
        USERNAME: u.USERNAME,
        STATUS: u.STATUS,
        TOTAL_CHECKIN: checkins.length
      };
    });
    return { success: true, data: panitiaStats };
  }

  // Default: daily attendance
  let list = [...db.attendance];
  if (params.eventId) list = list.filter(a => a.EVENT_ID === params.eventId);
  if (params.date) list = list.filter(a => a.DATE === params.date);
  if (params.startDate) list = list.filter(a => a.DATE >= params.startDate);
  if (params.endDate) list = list.filter(a => a.DATE <= params.endDate);

  const enriched = list.map(a => {
    const p = db.participants.find(p => p.ID === a.PARTICIPANT_ID);
    return {
      ...a,
      PARTICIPANT_NAME: p ? p.NAME : '',
      INSTITUTION: p ? p.INSTITUTION : '',
      PHONE: p ? p.PHONE : '',
      PRODUCT: p ? p.PRODUCT : ''
    };
  });

  return { success: true, data: enriched };
}

async function addLog(data) {
  const db = readDb();
  const maxNum = db.logs.reduce((max, l) => {
    if (l.LOG_ID && typeof l.LOG_ID === 'string') {
      const num = parseInt(l.LOG_ID.replace('LOG', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'LOG' + String(maxNum + 1).padStart(3, '0');
  const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());

  db.logs.push({
    LOG_ID: newId,
    TIMESTAMP: now,
    USER_ID: data.userId || '',
    ACTION: data.action || '',
    PARTICIPANT_ID: data.participantId || '',
    DESCRIPTION: data.description || ''
  });

  saveDb(db);
  return { success: true };
}

/**
 * Dump all data for synchronization
 */
async function getAllData() {
  const db = readDb();
  return {
    events: [...db.events],
    panitia: [...db.panitia],
    workshops: [...db.workshops],
    participants: [...db.participants],
    attendance: [...db.attendance],
    workshopAttendance: [...db.workshopAttendance],
    logs: [...db.logs]
  };
}

/**
 * Bulk import / replace data for synchronization
 */
async function importAllData(data = {}, options = { merge: false }) {
  const db = readDb();

  if (options.merge) {
    if (Array.isArray(data.participants)) {
      data.participants.forEach(p => {
        const idx = db.participants.findIndex(item => item.ID === p.ID);
        if (idx >= 0) db.participants[idx] = p;
        else db.participants.push(p);
      });
    }
    if (Array.isArray(data.attendance)) {
      data.attendance.forEach(a => {
        const idx = db.attendance.findIndex(item => item.ATTENDANCE_ID === a.ATTENDANCE_ID);
        if (idx >= 0) db.attendance[idx] = a;
        else db.attendance.push(a);
      });
    }
    if (Array.isArray(data.workshopAttendance)) {
      data.workshopAttendance.forEach(wa => {
        const idx = db.workshopAttendance.findIndex(item => item.ID === wa.ID);
        if (idx >= 0) db.workshopAttendance[idx] = wa;
        else db.workshopAttendance.push(wa);
      });
    }
    if (Array.isArray(data.logs)) {
      data.logs.forEach(l => {
        const idx = db.logs.findIndex(item => item.LOG_ID === l.LOG_ID);
        if (idx >= 0) db.logs[idx] = l;
        else db.logs.push(l);
      });
    }
  } else {
    if (Array.isArray(data.events) && data.events.length) db.events = data.events;
    if (Array.isArray(data.panitia) && data.panitia.length) db.panitia = data.panitia;
    if (Array.isArray(data.workshops) && data.workshops.length) db.workshops = data.workshops;
    if (Array.isArray(data.participants)) db.participants = data.participants;
    if (Array.isArray(data.attendance)) db.attendance = data.attendance;
    if (Array.isArray(data.workshopAttendance)) db.workshopAttendance = data.workshopAttendance;
    if (Array.isArray(data.logs)) db.logs = data.logs;
  }

  saveDb(db);
  return { success: true, count: { participants: db.participants.length, attendance: db.attendance.length } };
}

function resetData() {
  const defaultData = createDefaultDb();
  saveDb(defaultData);
}

module.exports = {
  providerName: 'json',
  init,
  initSpreadsheet,
  getEvent,
  getParticipants,
  getParticipantById,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  validateLogin,
  checkIn,
  getAttendanceToday,
  getAttendanceHistory,
  deleteAttendance,
  updateAttendance,
  getWorkshops,
  workshopCheckIn,
  getWorkshopAttendance,
  getReportData,
  addLog,
  getAllData,
  importAllData,
  resetData
};

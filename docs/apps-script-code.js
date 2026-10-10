/**
 * Google Apps Script — Absenin API
 * 
 * Deploy as Web App with:
 * - Execute as: Me
 * - Who has access: Anyone
 * 
 * Spreadsheet harus memiliki sheet:
 * EVENT, PESERTA, WORKSHOP, ABSENSI, ABSENSI_WORKSHOP, PANITIA, LOG
 */

// === CONFIG ===
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (err) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

// === WEB APP HANDLERS ===
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const action = e.parameter.action || '';
    const params = e.parameter;
    
    let postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        // ignore parse error for GET requests
      }
    }
    
    const allParams = { ...params, ...postData };
    let result;
    
    switch (action) {
      case 'init':
        result = init();
        break;
      case 'setupWorkshops':
        result = setupWorkshops();
        break;
      case 'importParticipants':
        result = importParticipants(allParams);
        break;
      case 'getEvent':
        result = getEvent();
        break;
      case 'getParticipants':
        result = getParticipants();
        break;
      case 'getParticipant':
        result = getParticipant(allParams.id);
        break;
      case 'addParticipant':
        result = addParticipant(allParams);
        break;
      case 'validateLogin':
        result = validateLogin(allParams.username, allParams.password);
        break;
      case 'checkIn':
        result = checkIn(allParams);
        break;
      case 'getAttendanceToday':
        result = getAttendanceToday(allParams.eventId, allParams.date);
        break;
      case 'getAttendanceHistory':
        result = getAttendanceHistory(allParams);
        break;
      case 'getWorkshops':
        result = getWorkshops();
        break;
      case 'workshopCheckIn':
        result = workshopCheckIn(allParams);
        break;
      case 'getWorkshopAttendance':
        result = getWorkshopAttendance(allParams);
        break;
      case 'getReportData':
        result = getReportData(allParams);
        break;
      case 'addLog':
        result = addLog(allParams);
        break;
      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// === HELPER: Sheet to Array of Objects ===
function sheetToArray(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((header, j) => {
      let val = data[i][j];
      if (val instanceof Date) {
        if (header === 'TIME') {
          val = Utilities.formatDate(val, 'GMT+7', 'HH:mm');
        } else if (header === 'DATE' || header === 'START_DATE' || header === 'END_DATE') {
          val = Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd');
        } else {
          val = Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
        }
      }
      row[header] = val;
    });
    rows.push(row);
  }
  
  return rows;
}

// === EVENT ===
function getEvent() {
  const events = sheetToArray('EVENT');
  const active = events.find(e => e.STATUS === 'ACTIVE');
  return {
    success: true,
    data: active || events[0] || null
  };
}

// === PARTICIPANTS ===
function getParticipants() {
  const participants = sheetToArray('PESERTA');
  return {
    success: true,
    data: participants
  };
}

function getParticipant(id) {
  const participants = sheetToArray('PESERTA');
  const found = participants.find(p => p.ID === id);
  if (!found) {
    return { success: false, message: 'Peserta tidak ditemukan.', code: 'NOT_FOUND' };
  }
  return { success: true, data: found };
}

function addParticipant(data) {
  const sheet = getSheet('PESERTA');
  if (!sheet) return { success: false, message: 'Sheet PESERTA tidak ditemukan.' };
  
  // Generate new ID
  const existing = sheetToArray('PESERTA');
  const maxNum = existing.reduce((max, p) => {
    if (p.ID && typeof p.ID === 'string') {
      const num = parseInt(p.ID.replace('P', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);
  
  const newId = 'P' + String(maxNum + 1).padStart(3, '0');
  const newNo = existing.length + 1;
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  
  const newRow = [
    newId,
    newNo,
    data.name || '',
    data.phone || '',
    data.institution || '',
    data.email || '',
    data.product || '',
    data.sympo || 0,
    data.workshopA || 0,
    data.workshopB || 0,
    data.workshopC || 0,
    data.note || '',
    data.source || 'MANUAL',
    timestamp,
    timestamp
  ];
  
  sheet.appendRow(newRow);
  
  const participant = {
    ID: newId,
    NO: newNo,
    NAME: data.name,
    PHONE: data.phone || '',
    INSTITUTION: data.institution || '',
    EMAIL: data.email || '',
    PRODUCT: data.product || '',
    SYMPO: data.sympo || 0,
    WORKSHOP_A: data.workshopA || 0,
    WORKSHOP_B: data.workshopB || 0,
    WORKSHOP_C: data.workshopC || 0,
    NOTE: data.note || '',
    SOURCE: data.source || 'MANUAL',
    CREATED_AT: timestamp,
    UPDATED_AT: timestamp
  };
  
  return {
    success: true,
    data: participant
  };
}

// === AUTH ===
function validateLogin(username, password) {
  const panitia = sheetToArray('PANITIA');
  const user = panitia.find(p => 
    p.USERNAME === username && String(p.PASSWORD) === String(password)
  );
  
  if (!user) {
    return { 
      success: false, 
      message: 'Username atau password salah.',
      code: 'INVALID_CREDENTIALS'
    };
  }
  
  if (user.STATUS !== 'ACTIVE') {
    return {
      success: false,
      message: 'Akun tidak aktif.',
      code: 'ACCOUNT_INACTIVE'
    };
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

// === ATTENDANCE ===
function checkIn(data) {
  const sheet = getSheet('ABSENSI');
  if (!sheet) return { success: false, message: 'Sheet ABSENSI tidak ditemukan.' };
  
  // Check duplicate
  const existing = sheetToArray('ABSENSI');
  const duplicate = existing.find(a =>
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
  
  // Generate attendance ID
  const maxNum = existing.reduce((max, a) => {
    if (a.ATTENDANCE_ID && typeof a.ATTENDANCE_ID === 'string') {
      const num = parseInt(a.ATTENDANCE_ID.replace('ABS', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);
  
  const newId = 'ABS' + String(maxNum + 1).padStart(3, '0');
  
  const newRow = [
    newId,
    data.eventId,
    data.participantId,
    data.date,
    data.time,
    data.userId,
    'HADIR'
  ];
  
  sheet.appendRow(newRow);

  const participants = sheetToArray('PESERTA');
  const participant = participants.find(p => p.ID === data.participantId);
  
  return {
    success: true,
    data: {
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
    }
  };
}

function getAttendanceToday(eventId, date) {
  const attendance = sheetToArray('ABSENSI');
  const participants = sheetToArray('PESERTA');
  const pMap = {};
  participants.forEach(p => { pMap[p.ID] = p; });

  const today = attendance
    .filter(a => a.EVENT_ID === eventId && a.DATE === date)
    .map(a => {
      const p = pMap[a.PARTICIPANT_ID] || {};
      return {
        ...a,
        PARTICIPANT_NAME: p.NAME || '',
        INSTITUTION: p.INSTITUTION || '',
        PHONE: p.PHONE || '',
        NOTE: p.NOTE || ''
      };
    });
  
  return {
    success: true,
    data: today
  };
}

function getAttendanceHistory(params) {
  let attendance = sheetToArray('ABSENSI');
  const participants = sheetToArray('PESERTA');
  const pMap = {};
  participants.forEach(p => { pMap[p.ID] = p; });
  
  let list = attendance.map(a => {
    const p = pMap[a.PARTICIPANT_ID] || {};
    return {
      ...a,
      PARTICIPANT_NAME: p.NAME || '',
      INSTITUTION: p.INSTITUTION || '',
      PHONE: p.PHONE || '',
      NOTE: p.NOTE || ''
    };
  });
  
  if (params.eventId) {
    list = list.filter(a => a.EVENT_ID === params.eventId);
  }
  if (params.date) {
    list = list.filter(a => a.DATE === params.date);
  }
  if (params.startDate) {
    list = list.filter(a => a.DATE >= params.startDate);
  }
  if (params.endDate) {
    list = list.filter(a => a.DATE <= params.endDate);
  }
  if (params.participantId) {
    list = list.filter(a => a.PARTICIPANT_ID === params.participantId);
  }
  
  // Sort by date desc, then time desc
  list.sort((a, b) => {
    if (a.DATE !== b.DATE) return b.DATE.localeCompare(a.DATE);
    return (b.TIME || '').localeCompare(a.TIME || '');
  });
  
  return {
    success: true,
    data: list
  };
}

// === WORKSHOP ===
function getWorkshops() {
  const workshops = sheetToArray('WORKSHOP');
  return {
    success: true,
    data: workshops.filter(w => w.STATUS === 'ACTIVE')
  };
}

function workshopCheckIn(data) {
  const sheet = getSheet('ABSENSI_WORKSHOP');
  if (!sheet) return { success: false, message: 'Sheet ABSENSI_WORKSHOP tidak ditemukan.' };
  
  // Check duplicate
  const existing = sheetToArray('ABSENSI_WORKSHOP');
  const duplicate = existing.find(a =>
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
  
  // Generate ID
  const maxNum = existing.reduce((max, a) => {
    if (a.ID && typeof a.ID === 'string') {
      const num = parseInt(a.ID.replace('WA', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);
  
  const newId = 'WA' + String(maxNum + 1).padStart(3, '0');
  
  sheet.appendRow([
    newId,
    data.eventId,
    data.participantId,
    data.workshopCode,
    data.date,
    data.time,
    data.userId
  ]);
  
  return {
    success: true,
    data: {
      id: newId,
      participantId: data.participantId,
      workshopCode: data.workshopCode,
      date: data.date,
      time: data.time
    }
  };
}

function getWorkshopAttendance(params) {
  let attendance = sheetToArray('ABSENSI_WORKSHOP');
  
  if (params.eventId) {
    attendance = attendance.filter(a => a.EVENT_ID === params.eventId);
  }
  if (params.date) {
    attendance = attendance.filter(a => a.DATE === params.date);
  }
  if (params.workshopCode) {
    attendance = attendance.filter(a => a.WORKSHOP_CODE === params.workshopCode);
  }
  
  return {
    success: true,
    data: attendance
  };
}

// === REPORTS ===
function getReportData(params) {
  const type = params.type || 'daily';
  
  if (type === 'export') {
    // Full export for Excel
    const event = getEvent();
    const participants = sheetToArray('PESERTA');
    const attendance = sheetToArray('ABSENSI');
    const workshopAttendance = sheetToArray('ABSENSI_WORKSHOP');
    const panitia = sheetToArray('PANITIA');
    const logs = sheetToArray('LOG');
    
    // Build recap
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
          eventName: event.data?.EVENT_NAME || 'PIT VIII PAPDI Purwokerto 2026',
          totalParticipants: participants.length,
          totalAttendance: attendance.length,
          totalWorkshops: workshopAttendance.length
        },
        participants,
        attendance,
        workshopAttendance,
        recap,
        panitia,
        logs
      }
    };
  }
  
  // Filtered reports
  let attendance = sheetToArray('ABSENSI');
  const participants = sheetToArray('PESERTA');
  
  if (params.eventId) {
    attendance = attendance.filter(a => a.EVENT_ID === params.eventId);
  }
  if (params.date) {
    attendance = attendance.filter(a => a.DATE === params.date);
  }
  if (params.startDate) {
    attendance = attendance.filter(a => a.DATE >= params.startDate);
  }
  if (params.endDate) {
    attendance = attendance.filter(a => a.DATE <= params.endDate);
  }
  
  // Enrich with participant names
  const enriched = attendance.map(a => {
    const p = participants.find(p => p.ID === a.PARTICIPANT_ID);
    return {
      ...a,
      PARTICIPANT_NAME: p ? p.NAME : '',
      INSTITUTION: p ? p.INSTITUTION : ''
    };
  });
  
  return {
    success: true,
    data: enriched
  };
}

// === LOG ===
function addLog(data) {
  const sheet = getSheet('LOG');
  if (!sheet) return { success: false };
  
  const existing = sheetToArray('LOG');
  const maxNum = existing.reduce((max, l) => {
    if (l.LOG_ID && typeof l.LOG_ID === 'string') {
      const num = parseInt(l.LOG_ID.replace('LOG', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);
  
  const newId = 'LOG' + String(maxNum + 1).padStart(3, '0');
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm');
  
  sheet.appendRow([
    newId,
    timestamp,
    data.userId || '',
    data.action || '',
    data.participantId || '',
    data.description || ''
  ]);
  
  return { success: true };
}

// === INITIAL SETUP / MIGRATION ===
/**
 * Jalankan fungsi ini sekali dari Apps Script editor (pilih fungsi 'init' lalu klik Run)
 * atau akses via URL Web App: ?action=init
 * 
 * Fungsi ini otomatis membuat seluruh 7 sheet yang dibutuhkan, mengatur header,
 * styling (bold, warna latar, freeze baris atas), serta mengisi data awal (event, workshop, panitia).
 */
function init() {
  const ss = getSpreadsheet();
  const results = [];
  
  const sheetDefinitions = [
    {
      name: 'EVENT',
      headers: ['EVENT_ID', 'EVENT_NAME', 'START_DATE', 'END_DATE', 'LOCATION', 'STATUS'],
      seedRows: [
        ['EVT001', 'PIT VIII PAPDI Purwokerto 2026', '2026-10-17', '2026-10-18', 'Java Heritage Hotel Purwokerto', 'ACTIVE']
      ]
    },
    {
      name: 'PESERTA',
      headers: [
        'ID', 'NO', 'NAME', 'PHONE', 'INSTITUTION', 'EMAIL', 'PRODUCT', 
        'SYMPO', 'WORKSHOP_A', 'WORKSHOP_B', 'WORKSHOP_C', 'NOTE', 'SOURCE', 
        'CREATED_AT', 'UPDATED_AT'
      ],
      seedRows: []
    },
    {
      name: 'WORKSHOP',
      headers: ['CODE', 'NAME', 'DATE', 'TIME', 'ROOM', 'QUOTA', 'STATUS'],
      seedRows: [
        ['W01', 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION', '2026-10-17', '08:00 - 12:00', 'Ruang Workshop A', 60, 'ACTIVE'],
        ['W02', 'BEDSIDE ULTRASOUND IN CRITICAL CARE', '2026-10-17', '13:00 - 17:00', 'Ruang Workshop B', 80, 'ACTIVE'],
        ['W03', 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS', '2026-10-18', '08:00 - 12:00', 'Ruang Workshop C', 40, 'ACTIVE']
      ]
    },
    {
      name: 'ABSENSI',
      headers: ['ATTENDANCE_ID', 'EVENT_ID', 'PARTICIPANT_ID', 'DATE', 'TIME', 'USER_ID', 'STATUS'],
      seedRows: []
    },
    {
      name: 'ABSENSI_WORKSHOP',
      headers: ['ID', 'EVENT_ID', 'PARTICIPANT_ID', 'WORKSHOP_CODE', 'DATE', 'TIME', 'USER_ID'],
      seedRows: []
    },
    {
      name: 'PANITIA',
      headers: ['USER_ID', 'NAME', 'USERNAME', 'PASSWORD', 'STATUS'],
      seedRows: [
        ['USR001', 'Panitia Utama', 'admin', 'password123', 'ACTIVE'],
        ['USR002', 'Panitia Absensi', 'panitia', 'password123', 'ACTIVE'],
        ['USR003', 'Akun Nonaktif', 'nonaktif', 'password123', 'INACTIVE'],
        ['USR004', 'Panitia Utama 1', 'absen1', 'password234', 'ACTIVE'],
        ['USR005', 'Panitia Utama 2', 'absen2', 'password234', 'ACTIVE'],
        ['USR006', 'Panitia Utama 3', 'absen3', 'password234', 'ACTIVE'],
        ['USR007', 'Panitia Utama 4', 'absen4', 'password234', 'ACTIVE'],
        ['USR008', 'Panitia Utama 5', 'absen5', 'password234', 'ACTIVE'],
        ['USR009', 'Panitia Utama 6', 'absen6', 'password234', 'ACTIVE'],
        ['USR010', 'Panitia Utama 7', 'absen7', 'password234', 'ACTIVE'],
        ['USR011', 'Panitia Utama 8', 'absen8', 'password234', 'ACTIVE'],
        ['USR012', 'Panitia Utama 9', 'absen9', 'password234', 'ACTIVE'],
        ['USR013', 'Panitia Utama 10', 'absen10', 'password234', 'ACTIVE'],
        ['USR014', 'Panitia Utama (Alias)', 'absen', 'password234', 'ACTIVE']
      ]
    },
    {
      name: 'LOG',
      headers: ['LOG_ID', 'TIMESTAMP', 'USER_ID', 'ACTION', 'PARTICIPANT_ID', 'DESCRIPTION'],
      seedRows: []
    }
  ];

  sheetDefinitions.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    let created = false;
    
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      created = true;
    }
    
    // Check if sheet is empty or lacks headers
    if (sheet.getLastRow() === 0) {
      // Set headers
      sheet.appendRow(def.headers);
      
      // Style headers: bold, background color, frozen row
      const headerRange = sheet.getRange(1, 1, 1, def.headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#F3F4F6');
      sheet.setFrozenRows(1);
      
      // Append seed rows if any
      if (def.seedRows && def.seedRows.length > 0) {
        def.seedRows.forEach(row => sheet.appendRow(row));
      }
      
      // Auto-resize columns
      for (let col = 1; col <= def.headers.length; col++) {
        try {
          sheet.autoResizeColumn(col);
        } catch (e) {}
      }
      
      results.push(`Sheet ${def.name}: ${created ? 'Dibuat baru' : 'Diinisialisasi'} (${def.headers.length} kolom)`);
    } else {
      results.push(`Sheet ${def.name}: Sudah ada (${sheet.getLastRow()} baris)`);
    }
  });

  // Hapus sheet default bawaan (Sheet1 / Sheet 1) jika ada dan kosong
  ['Sheet1', 'Sheet 1'].forEach(defaultName => {
    const defaultSheet = ss.getSheetByName(defaultName);
    if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
      try {
        ss.deleteSheet(defaultSheet);
        results.push(`Sheet bawaan '${defaultName}' dihapus karena kosong.`);
      } catch (err) {}
    }
  });

  Logger.log('Inisialisasi selesai:\n' + results.join('\n'));
  return {
    success: true,
    message: 'Inisialisasi seluruh sheet berhasil!',
    details: results
  };
}

// === SETUP WORKSHOP (UPDATE REAL WORKSHOP DATA) ===
/**
 * Jalankan fungsi ini untuk memperbarui sheet WORKSHOP dengan nama-nama workshop PIT VIII PAPDI
 */
function setupWorkshops() {
  const sheet = getSheet('WORKSHOP');
  if (!sheet) return { success: false, message: 'Sheet WORKSHOP tidak ditemukan' };
  
  // Hapus data lama (tetap simpan baris 1 header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  const workshopRows = [
    ['A', 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION', '2026-10-17', '08:00 - 12:00', 'Ruang Workshop A', 60, 'ACTIVE'],
    ['B', 'BEDSIDE ULTRASOUND IN CRITICAL CARE', '2026-10-17', '13:00 - 17:00', 'Ruang Workshop B', 80, 'ACTIVE'],
    ['C', 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS', '2026-10-18', '08:00 - 12:00', 'Ruang Workshop C', 40, 'ACTIVE']
  ];
  
  sheet.getRange(2, 1, workshopRows.length, workshopRows[0].length).setValues(workshopRows);
  
  // Auto-resize
  for (let c = 1; c <= workshopRows[0].length; c++) {
    try { sheet.autoResizeColumn(c); } catch (e) {}
  }
  
  return {
    success: true,
    message: 'Sheet WORKSHOP berhasil diperbarui dengan Workshop A, B, C!',
    data: workshopRows
  };
}

// === BATCH IMPORT PARTICIPANTS ===
/**
 * Mengimpor banyak peserta sekaligus ke sheet PESERTA secara cepat (1 panggilan)
 */
function importParticipants(data) {
  const sheet = getSheet('PESERTA');
  if (!sheet) return { success: false, message: 'Sheet PESERTA tidak ditemukan.' };
  
  const list = data.participants || [];
  if (!list.length) return { success: false, message: 'Tidak ada data peserta yang diberikan.' };
  
  if (data.clearExisting) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
  }
  
  const existing = sheetToArray('PESERTA');
  let currentMax = existing.reduce((max, p) => {
    if (p.ID && typeof p.ID === 'string') {
      const num = parseInt(p.ID.replace('P', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);
  
  const now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  
  const rows = list.map((p, idx) => {
    currentMax++;
    const id = p.ID || p.id || ('P' + String(currentMax).padStart(3, '0'));
    const no = p.NO || p.no || (existing.length + idx + 1);
    return [
      id,
      no,
      p.NAME || p.name || '',
      p.PHONE || p.phone || '',
      p.INSTITUTION || p.institution || '',
      p.EMAIL || p.email || '',
      p.PRODUCT || p.product || '',
      p.SYMPO !== undefined ? p.SYMPO : (p.sympo ? 1 : 0),
      p.WORKSHOP_A !== undefined ? p.WORKSHOP_A : (p.workshopA ? 1 : 0),
      p.WORKSHOP_B !== undefined ? p.WORKSHOP_B : (p.workshopB ? 1 : 0),
      p.WORKSHOP_C !== undefined ? p.WORKSHOP_C : (p.workshopC ? 1 : 0),
      p.NOTE || p.note || '',
      p.SOURCE || p.source || 'IMPORT',
      p.CREATED_AT || p.createdAt || now,
      p.UPDATED_AT || p.updatedAt || now
    ];
  });
  
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  
  return {
    success: true,
    message: `Berhasil mengimpor ${rows.length} peserta.`,
    count: rows.length
  };
}


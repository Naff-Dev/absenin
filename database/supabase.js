/**
 * Supabase Database Provider
 * Handles communication with Supabase (PostgreSQL) using @supabase/supabase-js.
 * Implements the unified Absenin database interface.
 */

const { createClient } = require('@supabase/supabase-js');
const { getServerDate, formatDate, formatTime } = require('../server/utils/helpers');

let supabaseClient = null;

function isConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  return Boolean(url && key && !url.includes('YOUR_SUPABASE'));
}

function getClient() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error('Konfigurasi Supabase tidak lengkap. Harap isi SUPABASE_URL dan SUPABASE_ANON_KEY (atau SUPABASE_SERVICE_ROLE_KEY) di file .env');
  }

  supabaseClient = createClient(url, key, {
    auth: { persistSession: false }
  });

  return supabaseClient;
}

// --- Mappers to maintain consistent uppercase data structure ---

function mapEvent(row) {
  if (!row) return null;
  return {
    EVENT_ID: row.event_id || row.EVENT_ID,
    EVENT_NAME: row.event_name || row.EVENT_NAME,
    START_DATE: row.start_date || row.START_DATE,
    END_DATE: row.end_date || row.END_DATE,
    LOCATION: row.location || row.LOCATION,
    STATUS: row.status || row.STATUS || 'ACTIVE'
  };
}

function mapParticipant(row) {
  if (!row) return null;
  return {
    ID: row.id || row.ID,
    NO: Number(row.no || row.NO || 0),
    NAME: row.name || row.NAME || '',
    PHONE: row.phone || row.PHONE || '',
    INSTITUTION: row.institution || row.INSTITUTION || '',
    EMAIL: row.email || row.EMAIL || '',
    PRODUCT: row.product || row.PRODUCT || '',
    SYMPO: Number(row.sympo !== undefined ? row.sympo : (row.SYMPO || 0)),
    WORKSHOP_A: Number(row.workshop_a !== undefined ? row.workshop_a : (row.WORKSHOP_A || 0)),
    WORKSHOP_B: Number(row.workshop_b !== undefined ? row.workshop_b : (row.WORKSHOP_B || 0)),
    WORKSHOP_C: Number(row.workshop_c !== undefined ? row.workshop_c : (row.WORKSHOP_C || 0)),
    NOTE: row.note || row.NOTE || '',
    SOURCE: row.source || row.SOURCE || 'MANUAL',
    CREATED_AT: row.created_at || row.CREATED_AT || '',
    UPDATED_AT: row.updated_at || row.UPDATED_AT || ''
  };
}

function participantToRow(p) {
  return {
    id: p.ID || p.id,
    no: p.NO || p.no,
    name: p.NAME || p.name,
    phone: p.PHONE || p.phone || '',
    institution: p.INSTITUTION || p.institution || '',
    email: p.EMAIL || p.email || '',
    product: p.PRODUCT || p.product || '',
    sympo: p.SYMPO !== undefined ? p.SYMPO : (p.sympo ? 1 : 0),
    workshop_a: p.WORKSHOP_A !== undefined ? p.WORKSHOP_A : (p.workshopA ? 1 : 0),
    workshop_b: p.WORKSHOP_B !== undefined ? p.WORKSHOP_B : (p.workshopB ? 1 : 0),
    workshop_c: p.WORKSHOP_C !== undefined ? p.WORKSHOP_C : (p.workshopC ? 1 : 0),
    note: p.NOTE || p.note || '',
    source: p.SOURCE || p.source || 'MANUAL',
    created_at: p.CREATED_AT || p.createdAt || '',
    updated_at: p.UPDATED_AT || p.updatedAt || ''
  };
}

function mapAttendance(row) {
  if (!row) return null;
  const rawP = row.participants || row.participant || {};
  const p = Array.isArray(rawP) ? (rawP[0] || {}) : rawP;
  return {
    ATTENDANCE_ID: row.attendance_id || row.ATTENDANCE_ID,
    EVENT_ID: row.event_id || row.EVENT_ID,
    PARTICIPANT_ID: row.participant_id || row.PARTICIPANT_ID,
    PARTICIPANT_NAME: row.participant_name || row.PARTICIPANT_NAME || p.name || p.NAME || '',
    INSTITUTION: row.institution || row.INSTITUTION || p.institution || p.INSTITUTION || '',
    PHONE: row.phone || row.PHONE || p.phone || p.PHONE || '',
    NOTE: row.note || row.NOTE || p.note || p.NOTE || '',
    DATE: row.date || row.DATE,
    TIME: row.time || row.TIME,
    USER_ID: row.user_id || row.USER_ID,
    STATUS: row.status || row.STATUS || 'HADIR'
  };
}

function mapWorkshopAttendance(row) {
  if (!row) return null;
  return {
    ID: row.id || row.ID,
    EVENT_ID: row.event_id || row.EVENT_ID,
    PARTICIPANT_ID: row.participant_id || row.PARTICIPANT_ID,
    WORKSHOP_CODE: row.workshop_code || row.WORKSHOP_CODE,
    DATE: row.date || row.DATE,
    TIME: row.time || row.TIME,
    USER_ID: row.user_id || row.USER_ID
  };
}

function mapWorkshop(row) {
  if (!row) return null;
  return {
    CODE: row.code || row.CODE,
    NAME: row.name || row.NAME,
    DATE: row.date || row.DATE,
    TIME: row.time || row.TIME,
    ROOM: row.room || row.ROOM,
    QUOTA: Number(row.quota || row.QUOTA || 50),
    STATUS: row.status || row.STATUS || 'ACTIVE'
  };
}

function mapPanitia(row) {
  if (!row) return null;
  return {
    USER_ID: row.user_id || row.USER_ID,
    NAME: row.name || row.NAME,
    USERNAME: row.username || row.USERNAME,
    PASSWORD: row.password || row.PASSWORD,
    STATUS: row.status || row.STATUS || 'ACTIVE'
  };
}

function mapLog(row) {
  if (!row) return null;
  return {
    LOG_ID: row.log_id || row.LOG_ID,
    TIMESTAMP: row.timestamp || row.TIMESTAMP,
    USER_ID: row.user_id || row.USER_ID || '',
    ACTION: row.action || row.ACTION || '',
    PARTICIPANT_ID: row.participant_id || row.PARTICIPANT_ID || '',
    DESCRIPTION: row.description || row.DESCRIPTION || ''
  };
}

// --- Provider Methods ---

async function init() {
  const supabase = getClient();

  // Verify connection by querying events
  const { data: eventData, error: eventErr } = await supabase.from('events').select('*').limit(1);

  if (eventErr) {
    throw new Error(`Koneksi Supabase gagal atau tabel belum dibuat: ${eventErr.message}. Harap jalankan database/supabase-schema.sql di Supabase SQL Editor.`);
  }

  // Seed default event if empty
  if (!eventData || eventData.length === 0) {
    await supabase.from('events').insert([
      {
        event_id: 'EVT001',
        event_name: 'PIT VIII PAPDI Purwokerto 2026',
        start_date: '2026-03-01',
        end_date: '2026-03-03',
        location: 'Purwokerto',
        status: 'ACTIVE'
      }
    ]);
  }

  // Seed default panitia if empty
  const { data: panitiaData } = await supabase.from('panitia').select('*').limit(1);
  if (!panitiaData || panitiaData.length === 0) {
    await supabase.from('panitia').insert([
      { user_id: 'USR001', name: 'Panitia Utama', username: 'admin', password: 'password123', status: 'ACTIVE' },
      { user_id: 'USR002', name: 'Panitia Absensi', username: 'panitia', password: 'password123', status: 'ACTIVE' },
      { user_id: 'USR003', name: 'Akun Nonaktif', username: 'nonaktif', password: 'password123', status: 'INACTIVE' },
      { user_id: 'USR004', name: 'Panitia Utama 1', username: 'absen1', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR005', name: 'Panitia Utama 2', username: 'absen2', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR006', name: 'Panitia Utama 3', username: 'absen3', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR007', name: 'Panitia Utama 4', username: 'absen4', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR008', name: 'Panitia Utama 5', username: 'absen5', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR009', name: 'Panitia Utama 6', username: 'absen6', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR010', name: 'Panitia Utama 7', username: 'absen7', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR011', name: 'Panitia Utama 8', username: 'absen8', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR012', name: 'Panitia Utama 9', username: 'absen9', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR013', name: 'Panitia Utama 10', username: 'absen10', password: 'password234', status: 'ACTIVE' },
      { user_id: 'USR014', name: 'Panitia Utama (Alias)', username: 'absen', password: 'password234', status: 'ACTIVE' }
    ]);
  }

  // Seed default workshops if empty
  const { data: wsData } = await supabase.from('workshops').select('*').limit(1);
  if (!wsData || wsData.length === 0) {
    await supabase.from('workshops').insert([
      { code: 'W01', name: 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION', date: '2026-03-01', time: '08:00 - 12:00', room: 'Ruang A', quota: 50, status: 'ACTIVE' },
      { code: 'W02', name: 'BEDSIDE ULTRASOUND IN CRITICAL CARE', date: '2026-03-01', time: '13:00 - 17:00', room: 'Ruang B', quota: 50, status: 'ACTIVE' },
      { code: 'W03', name: 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS', date: '2026-03-02', time: '08:00 - 12:00', room: 'Ruang C', quota: 40, status: 'ACTIVE' }
    ]);
  }

  return {
    success: true,
    message: 'Inisialisasi database Supabase berhasil!',
    details: [
      'Tabel events: Siap',
      'Tabel panitia: Siap',
      'Tabel workshops: Siap',
      'Tabel participants: Siap',
      'Tabel attendance: Siap',
      'Tabel workshop_attendance: Siap',
      'Tabel logs: Siap'
    ]
  };
}

async function initSpreadsheet() {
  return init();
}

async function getEvent() {
  const supabase = getClient();
  const { data, error } = await supabase.from('events').select('*').eq('status', 'ACTIVE').limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return { success: true, data: mapEvent(data) };
}

async function getParticipants() {
  const supabase = getClient();
  const { data, error } = await supabase.from('participants').select('*').order('no', { ascending: true });
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []).map(mapParticipant) };
}

async function getParticipantById(id) {
  const supabase = getClient();
  const { data, error } = await supabase.from('participants').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { success: false, message: 'Peserta tidak ditemukan.', code: 'NOT_FOUND' };
  }
  return { success: true, data: mapParticipant(data) };
}

async function addParticipant(data) {
  const supabase = getClient();

  // Determine new ID and NO
  const { data: allParticipants } = await supabase.from('participants').select('id, no');
  const maxNum = (allParticipants || []).reduce((max, p) => {
    if (p.id && typeof p.id === 'string') {
      const num = parseInt(p.id.replace('P', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'P' + String(maxNum + 1).padStart(3, '0');
  const newNo = (allParticipants || []).length + 1;
  const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());

  const row = {
    id: newId,
    no: newNo,
    name: data.name,
    phone: data.phone || '',
    institution: data.institution || '',
    email: data.email || '',
    product: data.product || '',
    sympo: data.sympo ? 1 : 0,
    workshop_a: data.workshopA ? 1 : 0,
    workshop_b: data.workshopB ? 1 : 0,
    workshop_c: data.workshopC ? 1 : 0,
    note: data.note || '',
    source: data.source || 'MANUAL',
    created_at: now,
    updated_at: now
  };

  const { data: inserted, error } = await supabase.from('participants').insert([row]).select().single();
  if (error) throw new Error(error.message);

  return { success: true, data: mapParticipant(inserted) };
}

async function updateParticipant(id, data) {
  const supabase = getClient();
  const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());

  const updateFields = {};
  if (data.name !== undefined) updateFields.name = data.name.trim();
  if (data.phone !== undefined) updateFields.phone = (data.phone || '').trim();
  if (data.institution !== undefined) updateFields.institution = (data.institution || '').trim();
  if (data.email !== undefined) updateFields.email = (data.email || '').trim();
  if (data.product !== undefined) updateFields.product = (data.product || '').trim();
  if (data.note !== undefined) updateFields.note = (data.note || '').trim();
  if (data.no !== undefined && data.no !== null && data.no !== '') updateFields.no = Number(data.no);
  if (data.sympo !== undefined) updateFields.sympo = data.sympo ? 1 : 0;
  if (data.workshopA !== undefined) updateFields.workshop_a = data.workshopA ? 1 : 0;
  else if (data.workshop_a !== undefined) updateFields.workshop_a = data.workshop_a ? 1 : 0;
  if (data.workshopB !== undefined) updateFields.workshop_b = data.workshopB ? 1 : 0;
  else if (data.workshop_b !== undefined) updateFields.workshop_b = data.workshop_b ? 1 : 0;
  if (data.workshopC !== undefined) updateFields.workshop_c = data.workshopC ? 1 : 0;
  else if (data.workshop_c !== undefined) updateFields.workshop_c = data.workshop_c ? 1 : 0;
  updateFields.updated_at = now;

  const { data: updated, error } = await supabase
    .from('participants')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { success: true, data: mapParticipant(updated) };
}

async function deleteParticipant(id) {
  const supabase = getClient();
  // 1. Delete associated attendances
  await supabase.from('attendance').delete().eq('participant_id', id);
  // 2. Delete participant
  const { data, error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  return { success: true, message: 'Peserta berhasil dihapus.', data: data && data[0] ? mapParticipant(data[0]) : null };
}

async function validateLogin(username, password) {
  const supabase = getClient();
  const { data, error } = await supabase.from('panitia').select('*').eq('username', username).maybeSingle();
  if (error) throw new Error(error.message);

  if (!data || String(data.password) !== String(password)) {
    return { success: false, message: 'Username atau password salah.', code: 'INVALID_CREDENTIALS' };
  }

  if (data.status !== 'ACTIVE') {
    return { success: false, message: 'Akun tidak aktif.', code: 'ACCOUNT_INACTIVE' };
  }

  return {
    success: true,
    data: {
      USER_ID: data.user_id,
      NAME: data.name,
      USERNAME: data.username,
      STATUS: data.status
    }
  };
}

async function checkIn(data) {
  const supabase = getClient();

  // 1. Check duplicate
  const { data: existing, error: checkErr } = await supabase
    .from('attendance')
    .select('*')
    .eq('event_id', data.eventId)
    .eq('participant_id', data.participantId)
    .eq('date', data.date)
    .maybeSingle();

  if (checkErr) throw new Error(checkErr.message);

  if (existing) {
    return {
      success: false,
      message: 'Peserta sudah check-in hari ini.',
      code: 'ALREADY_CHECKED_IN',
      data: {
        time: existing.time,
        userId: existing.user_id
      }
    };
  }

  // 2. Generate new ATTENDANCE_ID
  const { data: allAttendance } = await supabase.from('attendance').select('attendance_id');
  const maxNum = (allAttendance || []).reduce((max, a) => {
    if (a.attendance_id && typeof a.attendance_id === 'string') {
      const num = parseInt(a.attendance_id.replace('ABS', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'ABS' + String(maxNum + 1).padStart(3, '0');
  const row = {
    attendance_id: newId,
    event_id: data.eventId,
    participant_id: data.participantId,
    date: data.date,
    time: data.time,
    user_id: data.userId,
    status: 'HADIR'
  };

  const { data: inserted, error: insertErr } = await supabase.from('attendance').insert([row]).select().single();
  if (insertErr) throw new Error(insertErr.message);

  // Ambil detail peserta untuk respon lengkap
  const { data: participantData } = await supabase
    .from('participants')
    .select('name, institution, phone, note')
    .eq('id', data.participantId)
    .maybeSingle();

  return {
    success: true,
    data: mapAttendance({
      ...inserted,
      participants: participantData || {}
    })
  };
}

async function getAttendanceToday(eventId, date) {
  const supabase = getClient();
  let data, error;
  try {
    const res = await supabase
      .from('attendance')
      .select('*, participants(name, institution, phone, note)')
      .eq('event_id', eventId)
      .eq('date', date);
    data = res.data;
    error = res.error;
  } catch (err) {
    error = err;
  }

  if (error || !data) {
    const res = await supabase.from('attendance').select('*').eq('event_id', eventId).eq('date', date);
    if (res.error) throw new Error(res.error.message);
    const { data: pList } = await supabase.from('participants').select('id, name, institution, phone, note');
    const pMap = new Map((pList || []).map(p => [p.id, p]));
    const mapped = (res.data || []).map(a => {
      const p = pMap.get(a.participant_id) || {};
      return mapAttendance({ ...a, participants: p });
    });
    return { success: true, data: mapped };
  }

  return { success: true, data: (data || []).map(mapAttendance) };
}

async function getAttendanceHistory(params = {}) {
  const supabase = getClient();
  let query = supabase.from('attendance').select('*, participants(name, institution, phone, note)');

  if (params.eventId) query = query.eq('event_id', params.eventId);
  if (params.date) query = query.eq('date', params.date);
  if (params.startDate) query = query.gte('date', params.startDate);
  if (params.endDate) query = query.lte('date', params.endDate);
  if (params.participantId) query = query.eq('participant_id', params.participantId);

  query = query.order('date', { ascending: false }).order('time', { ascending: false });

  const { data, error } = await query;
  if (error) {
    let fallbackQuery = supabase.from('attendance').select('*');
    if (params.eventId) fallbackQuery = fallbackQuery.eq('event_id', params.eventId);
    if (params.date) fallbackQuery = fallbackQuery.eq('date', params.date);
    if (params.startDate) fallbackQuery = fallbackQuery.gte('date', params.startDate);
    if (params.endDate) fallbackQuery = fallbackQuery.lte('date', params.endDate);
    if (params.participantId) fallbackQuery = fallbackQuery.eq('participant_id', params.participantId);
    fallbackQuery = fallbackQuery.order('date', { ascending: false }).order('time', { ascending: false });

    const fallbackRes = await fallbackQuery;
    if (fallbackRes.error) throw new Error(fallbackRes.error.message);

    const { data: pList } = await supabase.from('participants').select('id, name, institution, phone, note');
    const pMap = new Map((pList || []).map(p => [p.id, p]));
    const mapped = (fallbackRes.data || []).map(a => {
      const p = pMap.get(a.participant_id) || {};
      return mapAttendance({ ...a, participants: p });
    });
    return { success: true, data: mapped };
  }

  return { success: true, data: (data || []).map(mapAttendance) };
}

async function deleteAttendance(identifier, options = {}) {
  const supabase = getClient();
  let query = supabase.from('attendance').delete();

  if (options.byParticipant || (identifier && identifier.startsWith('P') && options.date)) {
    query = query.eq('participant_id', identifier);
    if (options.date) {
      query = query.eq('date', options.date);
    }
  } else {
    query = query.eq('attendance_id', identifier);
  }

  const { data, error } = await query.select();
  if (error) throw new Error(error.message);

  return {
    success: true,
    message: 'Data absensi berhasil dibatalkan / dihapus.',
    deletedCount: data ? data.length : 1
  };
}

async function updateAttendance(attendanceId, data) {
  const supabase = getClient();
  const updateFields = {};
  if (data.time !== undefined) updateFields.time = data.time;
  if (data.date !== undefined) updateFields.date = data.date;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.userId !== undefined) updateFields.user_id = data.userId;

  const { data: updated, error } = await supabase
    .from('attendance')
    .update(updateFields)
    .eq('attendance_id', attendanceId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { data: participantData } = await supabase
    .from('participants')
    .select('name, institution, phone, note')
    .eq('id', updated.participant_id)
    .maybeSingle();

  return {
    success: true,
    data: mapAttendance({
      ...updated,
      participants: participantData || {}
    })
  };
}

async function getWorkshops() {
  const supabase = getClient();
  const { data, error } = await supabase.from('workshops').select('*').eq('status', 'ACTIVE');
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []).map(mapWorkshop) };
}

async function workshopCheckIn(data) {
  const supabase = getClient();

  // Check duplicate
  const { data: existing, error: checkErr } = await supabase
    .from('workshop_attendance')
    .select('*')
    .eq('event_id', data.eventId)
    .eq('participant_id', data.participantId)
    .eq('workshop_code', data.workshopCode)
    .eq('date', data.date)
    .maybeSingle();

  if (checkErr) throw new Error(checkErr.message);

  if (existing) {
    return {
      success: false,
      message: 'Peserta sudah check-in workshop ini hari ini.',
      code: 'ALREADY_CHECKED_IN'
    };
  }

  const { data: allWa } = await supabase.from('workshop_attendance').select('id');
  const maxNum = (allWa || []).reduce((max, a) => {
    if (a.id && typeof a.id === 'string') {
      const num = parseInt(a.id.replace('WA', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }
    return max;
  }, 0);

  const newId = 'WA' + String(maxNum + 1).padStart(3, '0');
  const row = {
    id: newId,
    event_id: data.eventId,
    participant_id: data.participantId,
    workshop_code: data.workshopCode,
    date: data.date,
    time: data.time,
    user_id: data.userId
  };

  const { data: inserted, error: insertErr } = await supabase.from('workshop_attendance').insert([row]).select().single();
  if (insertErr) throw new Error(insertErr.message);

  return { success: true, data: mapWorkshopAttendance(inserted) };
}

async function getWorkshopAttendance(params = {}) {
  const supabase = getClient();
  let query = supabase.from('workshop_attendance').select('*');

  if (params.eventId) query = query.eq('event_id', params.eventId);
  if (params.date) query = query.eq('date', params.date);
  if (params.workshopCode) query = query.eq('workshop_code', params.workshopCode);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { success: true, data: (data || []).map(mapWorkshopAttendance) };
}

async function getReportData(params = {}) {
  const supabase = getClient();
  const type = params.type || 'daily';

  if (type === 'export') {
    const [eventsRes, participantsRes, attendanceRes, waRes, panitiaRes, logsRes] = await Promise.all([
      supabase.from('events').select('*').limit(1),
      supabase.from('participants').select('*').order('no', { ascending: true }),
      supabase.from('attendance').select('*'),
      supabase.from('workshop_attendance').select('*'),
      supabase.from('panitia').select('user_id, name, username, status'),
      supabase.from('logs').select('*').order('timestamp', { ascending: false })
    ]);

    const eventsList = (eventsRes.data || []).map(mapEvent);
    const participantsList = (participantsRes.data || []).map(mapParticipant);
    const attendanceList = (attendanceRes.data || []).map(mapAttendance);
    const waList = (waRes.data || []).map(mapWorkshopAttendance);
    const panitiaList = (panitiaRes.data || []).map(mapPanitia);
    const logsList = (logsRes.data || []).map(mapLog);

    const dates = [...new Set(attendanceList.map(a => a.DATE))].sort();
    const recap = participantsList.map(p => {
      const row = { NO: p.NO, NAME: p.NAME, INSTITUTION: p.INSTITUTION };
      dates.forEach(date => {
        const found = attendanceList.find(a => a.PARTICIPANT_ID === p.ID && a.DATE === date);
        row[date] = found ? '✓' : '-';
      });
      row['TOTAL'] = dates.filter(date =>
        attendanceList.find(a => a.PARTICIPANT_ID === p.ID && a.DATE === date)
      ).length;
      return row;
    });

    return {
      success: true,
      data: {
        summary: {
          eventName: eventsList[0]?.EVENT_NAME || 'PIT VIII PAPDI Purwokerto 2026',
          totalParticipants: participantsList.length,
          totalAttendance: attendanceList.length,
          totalWorkshops: waList.length
        },
        participants: participantsList,
        attendance: attendanceList,
        workshopAttendance: waList,
        recap,
        panitia: panitiaList,
        logs: logsList
      }
    };
  }

  // Daily / Filtered report
  let query = supabase.from('attendance').select('*');
  if (params.eventId) query = query.eq('event_id', params.eventId);
  if (params.date) query = query.eq('date', params.date);
  if (params.startDate) query = query.gte('date', params.startDate);
  if (params.endDate) query = query.lte('date', params.endDate);

  const { data: attendanceData, error } = await query;
  if (error) throw new Error(error.message);

  const { data: participantsData } = await supabase.from('participants').select('id, name, institution');
  const pMap = new Map((participantsData || []).map(p => [p.id, p]));

  const enriched = (attendanceData || []).map(a => {
    const mapped = mapAttendance(a);
    const p = pMap.get(mapped.PARTICIPANT_ID);
    return {
      ...mapped,
      PARTICIPANT_NAME: p ? p.name : '',
      INSTITUTION: p ? p.institution : ''
    };
  });

  return { success: true, data: enriched };
}

async function addLog(data) {
  try {
    const supabase = getClient();
    const now = formatDate(getServerDate()) + ' ' + formatTime(getServerDate());
    const logId = 'LOG' + Date.now().toString().slice(-6);

    await supabase.from('logs').insert([
      {
        log_id: logId,
        timestamp: now,
        user_id: data.userId || '',
        action: data.action || '',
        participant_id: data.participantId || '',
        description: data.description || ''
      }
    ]);

    return { success: true };
  } catch (err) {
    console.error('[Supabase] Log write failed:', err.message);
    return { success: false };
  }
}

/**
 * Dump all data from Supabase for synchronization
 */
async function getAllData() {
  const supabase = getClient();
  const [eventsRes, panitiaRes, workshopsRes, participantsRes, attendanceRes, waRes, logsRes] = await Promise.all([
    supabase.from('events').select('*'),
    supabase.from('panitia').select('*'),
    supabase.from('workshops').select('*'),
    supabase.from('participants').select('*').order('no', { ascending: true }),
    supabase.from('attendance').select('*'),
    supabase.from('workshop_attendance').select('*'),
    supabase.from('logs').select('*')
  ]);

  return {
    events: (eventsRes.data || []).map(mapEvent),
    panitia: (panitiaRes.data || []).map(mapPanitia),
    workshops: (workshopsRes.data || []).map(mapWorkshop),
    participants: (participantsRes.data || []).map(mapParticipant),
    attendance: (attendanceRes.data || []).map(mapAttendance),
    workshopAttendance: (waRes.data || []).map(mapWorkshopAttendance),
    logs: (logsRes.data || []).map(mapLog)
  };
}

/**
 * Bulk import / upsert data into Supabase
 */
async function importAllData(data = {}) {
  const supabase = getClient();

  if (Array.isArray(data.events) && data.events.length > 0) {
    const rows = data.events.map(e => ({
      event_id: e.EVENT_ID || e.eventId,
      event_name: e.EVENT_NAME || e.eventName,
      start_date: e.START_DATE || e.startDate,
      end_date: e.END_DATE || e.endDate,
      location: e.LOCATION || e.location,
      status: e.STATUS || e.status || 'ACTIVE'
    }));
    await supabase.from('events').upsert(rows, { onConflict: 'event_id' });
  }

  if (Array.isArray(data.panitia) && data.panitia.length > 0) {
    const rows = data.panitia.map(p => ({
      user_id: p.USER_ID || p.userId,
      name: p.NAME || p.name,
      username: p.USERNAME || p.username,
      password: p.PASSWORD || p.password,
      status: p.STATUS || p.status || 'ACTIVE'
    }));
    await supabase.from('panitia').upsert(rows, { onConflict: 'user_id' });
  }

  if (Array.isArray(data.workshops) && data.workshops.length > 0) {
    const rows = data.workshops.map(w => ({
      code: w.CODE || w.code,
      name: w.NAME || w.name,
      date: w.DATE || w.date,
      time: w.TIME || w.time,
      room: w.ROOM || w.room,
      quota: w.QUOTA || w.quota || 50,
      status: w.STATUS || w.status || 'ACTIVE'
    }));
    await supabase.from('workshops').upsert(rows, { onConflict: 'code' });
  }

  if (Array.isArray(data.participants) && data.participants.length > 0) {
    const rows = data.participants.map(participantToRow);
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('participants').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error(`[Supabase Import] Error upserting participants chunk ${i}-${i + chunk.length}:`, error.message);
        throw new Error(`Gagal import peserta ke Supabase: ${error.message}`);
      }
    }
  }

  if (Array.isArray(data.attendance) && data.attendance.length > 0) {
    const rows = data.attendance.map(a => ({
      attendance_id: a.ATTENDANCE_ID || a.attendanceId,
      event_id: a.EVENT_ID || a.eventId,
      participant_id: a.PARTICIPANT_ID || a.participantId,
      date: a.DATE || a.date,
      time: a.TIME || a.time,
      user_id: a.USER_ID || a.userId,
      status: a.STATUS || a.status || 'HADIR'
    }));
    await supabase.from('attendance').upsert(rows, { onConflict: 'attendance_id' });
  }

  if (Array.isArray(data.workshopAttendance) && data.workshopAttendance.length > 0) {
    const rows = data.workshopAttendance.map(wa => ({
      id: wa.ID || wa.id,
      event_id: wa.EVENT_ID || wa.eventId,
      participant_id: wa.PARTICIPANT_ID || wa.participantId,
      workshop_code: wa.WORKSHOP_CODE || wa.workshopCode,
      date: wa.DATE || wa.date,
      time: wa.TIME || wa.time,
      user_id: wa.USER_ID || wa.userId
    }));
    await supabase.from('workshop_attendance').upsert(rows, { onConflict: 'id' });
  }

  if (Array.isArray(data.logs) && data.logs.length > 0) {
    const rows = data.logs.map(l => ({
      log_id: l.LOG_ID || l.logId,
      timestamp: l.TIMESTAMP || l.timestamp,
      user_id: l.USER_ID || l.userId || '',
      action: l.ACTION || l.action || '',
      participant_id: l.PARTICIPANT_ID || l.participantId || '',
      description: l.DESCRIPTION || l.description || ''
    }));
    await supabase.from('logs').upsert(rows, { onConflict: 'log_id' });
  }

  return { success: true };
}

/**
 * Reset all attendance records and logs, keeping official participants and panitia
 */
async function resetData() {
  const supabase = getClient();
  const resAtt = await supabase.from('attendance').delete().neq('attendance_id', '');
  if (resAtt.error) console.error('[Supabase Reset] Attendance error:', resAtt.error.message);

  const resWa = await supabase.from('workshop_attendance').delete().neq('id', '');
  if (resWa.error) console.error('[Supabase Reset] Workshop attendance error:', resWa.error.message);

  const resLogs = await supabase.from('logs').delete().neq('log_id', '');
  if (resLogs.error) console.error('[Supabase Reset] Logs error:', resLogs.error.message);

  // Hapus peserta testing (> 243) jika ada agar 243 peserta resmi tetap aman
  const resPart = await supabase.from('participants').delete().gt('no', 243);
  if (resPart.error) console.error('[Supabase Reset] Test participants error:', resPart.error.message);

  await addLog({
    userId: 'SYSTEM',
    action: 'RESET_DATA',
    description: 'Data absensi, log, dan peserta testing di Supabase dibersihkan (fresh state).'
  });

  return { success: true, message: 'Data absensi Supabase berhasil direset ke fresh state (243 peserta resmi aman).' };
}

module.exports = {
  providerName: 'supabase',
  isConfigured,
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

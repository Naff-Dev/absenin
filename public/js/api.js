/**
 * Absenin API Client
 * All HTTP communication with the Express backend
 */

const API = (() => {
  const BASE = '/api';

  function getToken() {
    return sessionStorage.getItem('absenin_token');
  }

  function setToken(token) {
    sessionStorage.setItem('absenin_token', token);
  }

  function clearToken() {
    sessionStorage.removeItem('absenin_token');
  }

  function getUser() {
    const raw = sessionStorage.getItem('absenin_user');
    return raw ? JSON.parse(raw) : null;
  }

  function setUser(user) {
    sessionStorage.setItem('absenin_user', JSON.stringify(user));
  }

  function clearUser() {
    sessionStorage.removeItem('absenin_user');
  }

  async function request(method, path, body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const token = getToken();
    if (token) {
      opts.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE}${path}`, opts);

    // Handle 401 — redirect to login
    if (res.status === 401) {
      clearToken();
      clearUser();
      window.location.reload();
      throw new Error('Sesi berakhir');
    }

    // For file downloads
    if (res.headers.get('content-type')?.includes('spreadsheet')) {
      return res.blob();
    }

    const data = await res.json();

    if (!res.ok && !data.success) {
      const err = new Error(data.message || 'Terjadi kesalahan.');
      err.code = data.code;
      err.data = data.data;
      throw err;
    }

    return data;
  }

  // Auth
  async function login(username, password) {
    const result = await request('POST', '/auth/login', { username, password });
    if (result.success) {
      setToken(result.data.token);
      setUser(result.data.user);
    }
    return result;
  }

  async function logout() {
    try {
      await request('POST', '/auth/logout');
    } catch (_) { /* ignore */ }
    clearToken();
    clearUser();
  }

  async function getMe() {
    return request('GET', '/auth/me');
  }

  // Event
  async function getEvent() {
    return request('GET', '/event');
  }

  // Participants
  async function getParticipants() {
    return request('GET', '/participants');
  }

  async function refreshParticipants() {
    return request('GET', '/participants/refresh');
  }

  async function getParticipant(id) {
    return request('GET', `/participants/${id}`);
  }

  async function addParticipant(data) {
    return request('POST', '/participants', data);
  }

  async function updateParticipant(id, data) {
    return request('PUT', `/participants/${id}`, data);
  }

  async function deleteParticipant(id) {
    return request('DELETE', `/participants/${id}`);
  }

  // Attendance (Single unified attendance)
  async function checkIn(participantId, eventId) {
    return request('POST', '/attendance/check-in', { participantId, eventId });
  }

  async function cancelCheckIn(participantId, date, eventId) {
    const q = new URLSearchParams();
    if (date) q.set('date', date);
    if (eventId) q.set('eventId', eventId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request('DELETE', `/attendance/participant/${participantId}${qs}`);
  }

  async function deleteAttendance(attendanceId) {
    return request('DELETE', `/attendance/${attendanceId}`);
  }

  async function updateAttendance(attendanceId, data) {
    return request('PUT', `/attendance/${attendanceId}`, data);
  }

  async function getAttendanceToday(eventId, date) {
    let q = `?eventId=${eventId || 'EVT001'}`;
    if (date) q += `&date=${date}`;
    q += `&_t=${Date.now()}`;
    return request('GET', `/attendance/today${q}`);
  }

  async function getAttendanceHistory(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/attendance/history?${q}`);
  }

  async function getServerTime() {
    return request('GET', '/attendance/server-time');
  }

  // Workshops
  async function getWorkshops() {
    return request('GET', '/workshops');
  }

  async function workshopCheckIn(participantId, workshopCode, eventId) {
    return request('POST', '/workshops/check-in', { participantId, workshopCode, eventId });
  }

  async function getWorkshopAttendance(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/workshops/attendance?${q}`);
  }

  // Reports
  async function getReports(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/reports?${q}`);
  }

  async function exportExcel(eventId) {
    const token = getToken();
    const res = await fetch(`${BASE}/reports/export?eventId=${eventId || 'EVT001'}&type=all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Gagal mengexport');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Absenin_PIT_VIII_PAPDI_2026.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function cleanDatabase() {
    return request('POST', '/database/clean');
  }

  async function syncDatabase(source, target) {
    return request('POST', '/database/sync', { source, target });
  }

  return {
    getToken, setToken, clearToken,
    getUser, setUser, clearUser,
    login, logout, getMe,
    getEvent,
    getParticipants, refreshParticipants, getParticipant, addParticipant, updateParticipant, deleteParticipant,
    checkIn, cancelCheckIn, deleteAttendance, updateAttendance, getAttendanceToday, getAttendanceHistory, getServerTime,
    getWorkshops, workshopCheckIn, getWorkshopAttendance,
    getReports, getReportData: getReports,
    exportExcel, downloadReportExcel: exportExcel,
    cleanDatabase, syncDatabase
  };
})();

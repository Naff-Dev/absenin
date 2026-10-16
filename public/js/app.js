/**
 * Absenin — Main Application
 * Modern Mobile-First Attendance System (PIT VIII PAPDI 2026)
 */

(() => {
  'use strict';

  // === STATE ===
  let currentPage = 'dashboard';
  let participants = [];
  let workshops = [];
  let attendanceToday = [];
  let eventData = null;
  let searchDebounce = null;
  let activeParticipantFilter = 'all';

  // === WORKSHOP METADATA MAPPING (LANGSUNG NAMA WORKSHOP) ===
  const WORKSHOP_MAPPING = {
    A: { name: 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION' },
    B: { name: 'BEDSIDE ULTRASOUND IN CRITICAL CARE' },
    C: { name: 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS' }
  };

  // Helper untuk mendapatkan nama workshop yang diikuti peserta (langsung nama, tanpa kode/ruang/waktu)
  function getEnrolledWorkshops(p) {
    if (!p) return [];
    const list = [];
    const isA = p.WORKSHOP_A == 1 || p.WORKSHOP_A === '1' || p.WORKSHOP_A === true || String(p.WORKSHOP_A).trim() === '1';
    const isB = p.WORKSHOP_B == 1 || p.WORKSHOP_B === '1' || p.WORKSHOP_B === true || String(p.WORKSHOP_B).trim() === '1';
    const isC = p.WORKSHOP_C == 1 || p.WORKSHOP_C === '1' || p.WORKSHOP_C === true || String(p.WORKSHOP_C).trim() === '1';

    if (isA) {
      const ws = workshops.find(w => w.CODE === 'W01' || w.CODE === 'A') || WORKSHOP_MAPPING.A;
      list.push({ name: ws.NAME || WORKSHOP_MAPPING.A.name });
    }
    if (isB) {
      const ws = workshops.find(w => w.CODE === 'W02' || w.CODE === 'B') || WORKSHOP_MAPPING.B;
      list.push({ name: ws.NAME || WORKSHOP_MAPPING.B.name });
    }
    if (isC) {
      const ws = workshops.find(w => w.CODE === 'W03' || w.CODE === 'C') || WORKSHOP_MAPPING.C;
      list.push({ name: ws.NAME || WORKSHOP_MAPPING.C.name });
    }
    return list;
  }

  // === DOM REFS ===
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // === TOAST NOTIFICATION ===
  function toast(message, type = 'info') {
    const container = $('#toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 200);
    }, 2800);
  }

  // === DATE & TIME HELPERS (WIB ASIA/JAKARTA) ===
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  function formatDateId(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    return `${String(d).padStart(2, '0')} ${MONTHS_ID[m]} ${parts[0]}`;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    return `${String(d).padStart(2, '0')} ${MONTHS_SHORT[m]}`;
  }

  function todayStr() {
    const now = new Date();
    const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const y = wib.getFullYear();
    const m = String(wib.getMonth() + 1).padStart(2, '0');
    const d = String(wib.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTimeWib(timeVal) {
    if (!timeVal) return '—';
    const str = String(timeVal).trim();

    if (str.includes('T') || str.includes('Z')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const wibHours = String((d.getUTCHours() + 7) % 24).padStart(2, '0');
        const wibMinutes = String(d.getUTCMinutes()).padStart(2, '0');
        return `${wibHours}:${wibMinutes} WIB`;
      }
    }

    const m = str.match(/^(\d{1,2}):(\d{2})/);
    if (m) {
      return `${m[1].padStart(2, '0')}:${m[2]} WIB`;
    }

    return `${str} WIB`;
  }

  function formatDateWib(dateVal) {
    if (!dateVal) return '—';
    const str = String(dateVal).trim();
    if (str.includes('T') || str.includes('Z')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const wibDate = new Date(d.getTime() + 7 * 3600 * 1000);
        const y = wibDate.getUTCFullYear();
        const m = wibDate.getUTCMonth();
        const day = wibDate.getUTCDate();
        return `${String(day).padStart(2, '0')} ${MONTHS_ID[m]} ${y}`;
      }
    }
    return formatDateId(str);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getCleanInitial(name) {
    if (!name) return 'P';
    const clean = String(name).replace(/^(dr|dr\.|prof|prof\.|ns|apt)\s+/i, '').trim();
    return (clean.charAt(0) || 'P').toUpperCase();
  }

  // === NOTE & BADGE HELPERS ===
  function getNoteBadge(note) {
    if (!note || typeof note !== 'string') return '';
    const clean = note.trim();
    if (!clean) return '';
    const lower = clean.toLowerCase();

    const badges = [];

    if (lower.includes('voucher')) {
      badges.push(`<span class="badge badge-voucher" title="Peserta wajib memiliki/membawa voucher">🎫 Perlu Voucher</span>`);
    }
    if (lower.includes('panitia')) {
      badges.push(`<span class="badge badge-panitia" title="Panitia Pelaksana">🎖️ Panitia</span>`);
    }
    if (lower.includes('pembicara')) {
      badges.push(`<span class="badge badge-speaker" title="Pembicara">🎤 Pembicara</span>`);
    }
    if (lower.includes('moderator')) {
      badges.push(`<span class="badge badge-moderator" title="Moderator Sesi">🎙️ Moderator</span>`);
    }
    if (lower.includes('anggota papdi')) {
      badges.push(`<span class="badge badge-papdi">Anggota PAPDI</span>`);
    }

    if (badges.length > 0) {
      return badges.join(' ');
    }

    return `<span class="badge badge-neutral">${escapeHtml(clean)}</span>`;
  }

  // Format No HP ke link WhatsApp
  function formatWaLink(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1);
    } else if (!digits.startsWith('62')) {
      digits = '62' + digits;
    }
    return `https://wa.me/${digits}`;
  }

  // Salin teks ke clipboard
  function copyToClipboard(text, label = 'Teks') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast(`${label} berhasil disalin!`, 'info');
      }).catch(() => {
        fallbackCopy(text, label);
      });
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast(`${label} berhasil disalin!`, 'info');
    } catch (_) {
      toast(`Gagal menyalin ${label}`, 'error');
    }
    ta.remove();
  }

  // Dialog Konfirmasi Voucher Peserta
  async function showVoucherConfirmation(p) {
    if (!window.Swal) {
      return window.confirm(
        `PERINGATAN VOUCHER:\n\nPeserta atas nama "${p.NAME}" terdaftar dengan ketentuan VOUCHER.\n\nApakah peserta membawa atau memiliki voucher fisik/digital yang sah?`
      );
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Konfirmasi Voucher Peserta',
      html: `
        <div class="swal-voucher-prompt">
          <div class="swal-voucher-name">${escapeHtml(p.NAME)}</div>
          <div class="swal-voucher-meta">
            ${p.PHONE ? `<span>📱 <strong>${escapeHtml(p.PHONE)}</strong></span>` : ''}
            ${p.INSTITUTION ? `<span> · ${escapeHtml(p.INSTITUTION)}</span>` : ''}
          </div>
          <div class="swal-voucher-box">
            <span class="swal-voucher-icon">🎫</span>
            <div>Peserta ini terdaftar dengan catatan: <strong>${escapeHtml(p.NOTE || 'VOUCHER')}</strong>.</div>
          </div>
          <p class="swal-voucher-question">
            Apakah peserta <u>membawa atau memiliki voucher</u> yang sah?
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '✓ Ya, Membawa Voucher (Absen)',
      cancelButtonText: '✕ Batal (Belum Ada Voucher)',
      confirmButtonColor: '#0F172A',
      cancelButtonColor: '#64748B',
      reverseButtons: true,
      focusCancel: true,
      allowOutsideClick: false
    });

    return result.isConfirmed;
  }

  // Cek apakah peserta memiliki peran khusus Panitia / Moderator / Pembicara
  function isCommitteeOrSpecial(note) {
    if (!note) return false;
    const lower = note.toLowerCase();
    return lower.includes('panitia') || lower.includes('moderator') || lower.includes('pembicara');
  }

  // Parse peran untuk tampilan & styling yang elegan
  function getCommitteeRoleInfo(note) {
    const clean = (note || 'Panitia').trim();
    const lower = clean.toLowerCase();
    const isPanitia = lower.includes('panitia');
    const isModerator = lower.includes('moderator');
    const isPembicara = lower.includes('pembicara');

    let roleLabel = 'Panitia';
    let roleIcon = '🎖️';
    let roleColor = '#4338CA';
    let roleBg = '#EEF2FF';
    let roleBorder = '#C7D2FE';

    if (isPanitia && isPembicara) {
      roleLabel = 'Panitia & Pembicara';
      roleIcon = '🎖️🎤';
    } else if (isPanitia && isModerator) {
      roleLabel = 'Panitia & Moderator';
      roleIcon = '🎖️🎙️';
    } else if (isPembicara && isModerator) {
      roleLabel = 'Pembicara & Moderator';
      roleIcon = '🎤🎙️';
    } else if (isPanitia) {
      roleLabel = 'Panitia';
      roleIcon = '🎖️';
    } else if (isModerator) {
      roleLabel = 'Moderator';
      roleIcon = '🎙️';
      roleColor = '#0E7490';
      roleBg = '#ECFEFF';
      roleBorder = '#A5F3FC';
    } else if (isPembicara) {
      roleLabel = 'Pembicara';
      roleIcon = '🎤';
      roleColor = '#7E22CE';
      roleBg = '#FAF5FF';
      roleBorder = '#E9D5FF';
    }

    return {
      roleLabel,
      roleDisplay: clean,
      roleIcon,
      roleColor,
      roleBg,
      roleBorder
    };
  }

  // Dialog Konfirmasi Khusus Panitia / Moderator / Pembicara
  async function showCommitteeConfirmation(p) {
    const role = getCommitteeRoleInfo(p.NOTE);

    if (!window.Swal) {
      return window.confirm(
        `KONFIRMASI ${role.roleLabel.toUpperCase()}:\n\n` +
        `Peserta atas nama "${p.NAME}" terdaftar dengan peran: ${p.NOTE || role.roleLabel}.\n\n` +
        `Apakah Anda yakin ingin mengonfirmasi dan mencatat kehadiran untuk ${role.roleLabel} ini?`
      );
    }

    const result = await Swal.fire({
      icon: 'info',
      title: `Konfirmasi ${role.roleLabel}`,
      html: `
        <div class="swal-voucher-prompt swal-committee-prompt">
          <div class="swal-voucher-name">${escapeHtml(p.NAME)}</div>
          <div class="swal-voucher-meta">
            ${p.PHONE ? `<span>📱 <strong>${escapeHtml(p.PHONE)}</strong></span>` : ''}
            ${p.INSTITUTION ? `<span> · ${escapeHtml(p.INSTITUTION)}</span>` : '<span> · PIT VIII PAPDI Purwokerto</span>'}
          </div>
          <div class="swal-committee-box" style="background:${role.roleBg};border-color:${role.roleBorder};color:${role.roleColor};">
            <span class="swal-committee-icon">${role.roleIcon}</span>
            <div>
              <div style="font-size:0.75rem;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;opacity:0.85;">Status Penugasan</div>
              <div style="font-size:1.05rem;font-weight:700;">${escapeHtml(p.NOTE || role.roleLabel)}</div>
            </div>
          </div>
          <p class="swal-voucher-question">
            Konfirmasi pencatatan kehadiran untuk <u>${escapeHtml(p.NAME)}</u> sebagai <strong>${escapeHtml(role.roleLabel)}</strong>?
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `✓ Ya, Konfirmasi Kehadiran (${escapeHtml(role.roleLabel)})`,
      cancelButtonText: '✕ Batal',
      confirmButtonColor: '#0F172A',
      cancelButtonColor: '#64748B',
      reverseButtons: true,
      focusCancel: false,
      allowOutsideClick: false
    });

    return result.isConfirmed;
  }

  // === ROUTING ===
  function navigate(page, params = {}) {
    currentPage = page;

    // Sembunyikan semua halaman
    $$('.page-view').forEach(el => el.classList.remove('active'));

    // Tampilkan halaman tujuan
    const target = $(`#page-${page}`);
    if (target) target.classList.add('active');

    // Update sidebar desktop
    $$('.sidebar-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Update mobile bottom nav
    $$('.mobile-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    window.scrollTo({ top: 0, behavior: 'instant' });

    // Page-specific initialization
    switch (page) {
      case 'dashboard': loadDashboard(); break;
      case 'attendance': initAttendance(); break;
      case 'participants': loadParticipants(); break;
      case 'participant-detail': loadParticipantDetail(params.id); break;
      case 'history': loadHistory(); break;
      case 'reports': break;
    }
  }

  // === INITIALIZATION ===
  async function init() {
    const token = API.getToken();
    const user = API.getUser();

    if (token && user) {
      await showApp(user);
    } else {
      showLogin();
    }

    setupEventListeners();
  }

  function showLogin() {
    $('#loginPage').style.display = 'flex';
    $('#app').classList.remove('active');
  }

  async function showApp(user) {
    $('#loginPage').style.display = 'none';
    $('#app').classList.add('active');

    const initial = getCleanInitial(user.name);
    $('#sidebarAvatar').textContent = initial;
    $('#sidebarUserName').textContent = user.name || 'Panitia';
    $('#mobileUserName').textContent = initial;
    $('#sheetUserAvatar').textContent = initial;
    $('#sheetUserName').textContent = user.name || 'Panitia Absensi';

    await loadInitialData();
    navigate('dashboard');
  }

  async function loadInitialData() {
    try {
      const eventResult = await API.getEvent();
      eventData = eventResult.data;

      if (eventData) {
        const eventName = eventData.EVENT_NAME || 'PIT VIII PAPDI 2026';
        $('#sidebarEvent').textContent = eventName;
        $('#mobileEventTag').textContent = eventName;
      }

      // Ambil metadata workshop untuk mapping nama
      try {
        const wsResult = await API.getWorkshops();
        workshops = wsResult.data || [];
      } catch (_) {}

      const participantsResult = await API.getParticipants();
      participants = participantsResult.data || [];

      // Pre-fetch absensi hari ini
      try {
        const attResult = await API.getAttendanceToday('EVT001', todayStr());
        attendanceToday = attResult.data || [];
      } catch (_) {}

      updateDashboardStats();
    } catch (error) {
      console.error('Gagal memuat data awal:', error.message);
      toast('Gagal memuat data awal. Silakan refresh halaman.', 'error');
    }
  }

  // === EVENT LISTENERS ===
  function setupEventListeners() {
    $('#loginForm').addEventListener('submit', handleLogin);

    // Sidebar navigation (Desktop)
    $$('.sidebar-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.dataset.page);
      });
    });

    // Mobile Bottom Nav
    $$('.mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(btn.dataset.page);
      });
    });

    // Profile & User Sheet
    $('#mobileUserBtn').addEventListener('click', () => {
      $('#userProfileSheet').style.display = 'flex';
    });

    $('#userProfileClose').addEventListener('click', () => {
      $('#userProfileSheet').style.display = 'none';
    });

    $('#sidebarLogout').addEventListener('click', handleLogout);
    $('#mobileLogoutBtn').addEventListener('click', handleLogout);

    $('#sheetSyncBtn').addEventListener('click', async () => {
      $('#userProfileSheet').style.display = 'none';
      await syncAllData();
    });

    // Dashboard Refresh
    $('#dashboardRefreshBtn').addEventListener('click', () => {
      loadDashboard(true);
    });

    // Attendance View
    $('#attendanceSearch').addEventListener('input', handleAttendanceSearch);
    $('#attendanceSearchClear').addEventListener('click', () => {
      $('#attendanceSearch').value = '';
      handleAttendanceSearch();
      $('#attendanceSearch').focus();
    });
    $('#attendanceAddBtn').addEventListener('click', openAddParticipant);
    $('#attendanceAddTopBtn').addEventListener('click', openAddParticipant);

    // Participants View
    $('#participantsRefreshBtn').addEventListener('click', async () => {
      try {
        $('#participantsRefreshBtn').disabled = true;
        const result = await API.refreshParticipants();
        participants = result.data || [];
        filterParticipants();
        toast('Data peserta berhasil disinkronkan.', 'success');
      } catch (err) {
        toast('Gagal menyinkronkan data.', 'error');
      } finally {
        $('#participantsRefreshBtn').disabled = false;
      }
    });

    // Tambah Peserta Buttons (Desktop Sidebar, Mobile Header, Dashboard, Attendance, Participants)
    const addBtnSelectors = [
      '#participantsAddBtn',
      '#sidebarAddBtn',
      '#mobileAddBtn',
      '#dashboardAddBtn',
      '#attendanceAddTopBtn',
      '#attendanceAddBtn'
    ];
    addBtnSelectors.forEach(sel => {
      const btn = $(sel);
      if (btn) btn.addEventListener('click', openAddParticipant);
    });

    // Workshop Choice Cards Live Toggle Sync
    $$('.ws-choice-card input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        const card = input.closest('.ws-choice-card');
        if (card) {
          if (input.checked) card.classList.add('checked');
          else card.classList.remove('checked');
        }
      });
    });

    // Voucher Card Live Toggle Sync
    $$('.voucher-toggle-card input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        const card = input.closest('.voucher-toggle-card');
        if (card) {
          if (input.checked) card.classList.add('checked');
          else card.classList.remove('checked');
        }
      });
    });

    $('#participantsSearch').addEventListener('input', filterParticipants);

    // Participant filter chips
    $$('#participantsFilterChips .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('#participantsFilterChips .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeParticipantFilter = chip.dataset.filter || 'all';
        filterParticipants();
      });
    });

    // Detail Back Button
    $('#detailBackBtn').addEventListener('click', () => navigate('participants'));

    // History Filters
    $('#historyDate').addEventListener('change', loadHistory);
    $('#historySearch').addEventListener('input', loadHistory);
    $('#historyRefreshBtn').addEventListener('click', loadHistory);

    const histTodayBtn = $('#historyFilterToday');
    const histAllBtn = $('#historyFilterAll');
    if (histTodayBtn && histAllBtn) {
      histTodayBtn.addEventListener('click', () => {
        histTodayBtn.classList.add('active');
        histAllBtn.classList.remove('active');
        $('#historyDate').value = todayStr();
        loadHistory();
      });
      histAllBtn.addEventListener('click', () => {
        histAllBtn.classList.add('active');
        histTodayBtn.classList.remove('active');
        $('#historyDate').value = '';
        loadHistory();
      });
    }

    // Reports View
    $('#reportShowBtn').addEventListener('click', loadReport);
    $('#reportExportBtn').addEventListener('click', handleExportReport);

    // Add Participant Modal & Events
    $('#addParticipantClose').addEventListener('click', () => {
      $('#addParticipantModal').style.display = 'none';
    });
    $('#addSaveBtn').addEventListener('click', () => handleAddParticipant(false));
    $('#addSaveAbsenBtn').addEventListener('click', () => handleAddParticipant(true));
    $('#addName').addEventListener('input', handleDuplicateCheck);

    // Close modal on backdrop tap
    $('#addParticipantModal').addEventListener('click', (e) => {
      if (e.target === $('#addParticipantModal')) {
        $('#addParticipantModal').style.display = 'none';
      }
    });

    // Edit Participant Modal & Events
    $('#editParticipantClose').addEventListener('click', () => {
      $('#editParticipantModal').style.display = 'none';
    });
    $('#editCancelBtn').addEventListener('click', () => {
      $('#editParticipantModal').style.display = 'none';
    });
    $('#editSaveBtn').addEventListener('click', handleSaveEditParticipant);
    if ($('#editDeleteParticipantBtn')) {
      $('#editDeleteParticipantBtn').addEventListener('click', () => {
        const id = $('#editParticipantId').value;
        if (id) handleDeleteParticipant(id);
      });
    }
    $('#editParticipantModal').addEventListener('click', (e) => {
      if (e.target === $('#editParticipantModal')) {
        $('#editParticipantModal').style.display = 'none';
      }
    });

    // Edit Attendance Modal & Events
    $('#editAttendanceClose').addEventListener('click', () => {
      $('#editAttendanceModal').style.display = 'none';
    });
    $('#editAttendanceDismissBtn').addEventListener('click', () => {
      $('#editAttendanceModal').style.display = 'none';
    });
    $('#editAttendanceSaveBtn').addEventListener('click', handleSaveEditAttendance);
    $('#editAttendanceCancelBtn').addEventListener('click', () => {
      const pId = $('#editAttendanceParticipantId').value;
      const aId = $('#editAttendanceId').value;
      openCancelAttendance(pId, aId);
    });
    $('#editAttendanceModal').addEventListener('click', (e) => {
      if (e.target === $('#editAttendanceModal')) {
        $('#editAttendanceModal').style.display = 'none';
      }
    });

    $('#userProfileSheet').addEventListener('click', (e) => {
      if (e.target === $('#userProfileSheet')) {
        $('#userProfileSheet').style.display = 'none';
      }
    });
  }

  // === AUTHENTICATION ===
  async function handleLogin(e) {
    e.preventDefault();
    const username = $('#loginUsername').value.trim();
    const password = $('#loginPassword').value;
    const errorEl = $('#loginError');
    const btn = $('#loginBtn');

    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm spinner-white"></span> Masuk ke Sistem...';

    try {
      const result = await API.login(username, password);
      await showApp(result.data.user);
    } catch (error) {
      errorEl.textContent = error.message || 'Login gagal. Periksa username dan password.';
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'MASUK KE SISTEM';
    }
  }

  async function handleLogout() {
    if (confirm('Yakin ingin keluar dari akun?')) {
      await API.logout();
      participants = [];
      attendanceToday = [];
      $('#userProfileSheet').style.display = 'none';
      showLogin();
    }
  }

  async function syncAllData() {
    toast('Menyinkronkan data...', 'info');
    try {
      const pResult = await API.refreshParticipants();
      participants = pResult.data || [];
      const attResult = await API.getAttendanceToday('EVT001', todayStr());
      attendanceToday = attResult.data || [];
      updateDashboardStats();
      if (currentPage === 'participants') filterParticipants();
      if (currentPage === 'dashboard') loadDashboard();
      toast('Semua data berhasil disinkronkan.', 'success');
    } catch (err) {
      toast('Gagal menyinkronkan data.', 'error');
    }
  }

  // === DASHBOARD & DAILY ATTENDANCE GRAPH ===
  async function loadDashboard(forceRefresh = false) {
    const date = todayStr();
    $('#dashboardDate').textContent = formatDateWib(date);
    $('#attendanceDate').textContent = formatDateWib(date);

    try {
      if (!participants || participants.length === 0 || forceRefresh) {
        const result = forceRefresh ? await API.refreshParticipants() : await API.getParticipants();
        participants = result.data || [];
      }

      const attResult = await API.getAttendanceToday('EVT001', date);
      attendanceToday = attResult.data || [];

      updateDashboardStats();

      // Load all attendance history for Daily Attendance Graph
      let allHistory = [];
      try {
        const histResult = await API.getAttendanceHistory({ eventId: 'EVT001' });
        allHistory = histResult.data || [];
      } catch (_) {}

      // Render Grafik Kehadiran Tiap Hari
      renderDailyAttendanceChart(allHistory);

      // Aktivitas Terbaru (Maksimal 10 saja, sisanya ada tombol lihat riwayat)
      const recentAtt = [...attendanceToday]
        .sort((a, b) => (b.TIME || '').localeCompare(a.TIME || ''))
        .slice(0, 10);

      if (recentAtt.length === 0) {
        $('#dashboardActivity').innerHTML = `
          <div class="empty-state-card" style="box-shadow:none;border:none;padding:var(--sp-8) var(--sp-4);">
            <div class="empty-state-title" style="font-size:14px;">Belum Ada Kehadiran Hari Ini</div>
            <div class="empty-state-desc" style="font-size:12px;margin-bottom:0;">Data absensi yang tercatat akan langsung muncul di sini secara real-time.</div>
          </div>
        `;
      } else {
        let html = '';
        recentAtt.forEach(att => {
          let p = participants.find(item => item.ID === att.PARTICIPANT_ID);
          const name = (p && p.NAME)
            ? escapeHtml(p.NAME)
            : (att.PARTICIPANT_NAME ? escapeHtml(att.PARTICIPANT_NAME) : escapeHtml(att.PARTICIPANT_ID));
          const institution = (p && p.INSTITUTION)
            ? escapeHtml(p.INSTITUTION)
            : (att.INSTITUTION ? escapeHtml(att.INSTITUTION) : 'Peserta PIT VIII PAPDI');
          const timeDisplay = formatTimeWib(att.TIME);
          const wsList = p ? getEnrolledWorkshops(p) : [];
          const wsBadge = wsList.length > 0 
            ? `<span class="badge badge-info" style="font-size:10px;font-weight:600;">${escapeHtml(wsList.map(w => w.name).join(' · '))}</span>`
            : '';

          html += `
            <div class="activity-item">
              <div class="activity-time">${escapeHtml(timeDisplay)}</div>
              <div class="activity-content">
                <div class="activity-name">${name}</div>
                <div class="activity-desc">${institution} ${wsBadge}</div>
              </div>
              <span class="badge badge-success">✓ Hadir</span>
            </div>
          `;
        });

        // Link ke riwayat penuh jika ada aktivitas
        html += `
          <div style="padding: 10px 14px; text-align: center; border-top: 1px solid var(--c-border); background: var(--c-surface-subtle);">
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('history')" style="width:100%;font-weight:700;color:var(--c-accent);display:flex;align-items:center;justify-content:center;gap:6px;">
              <span>Lihat Seluruh Riwayat Kehadiran (${attendanceToday.length} Data)</span>
              <span>→</span>
            </button>
          </div>
        `;

        $('#dashboardActivity').innerHTML = html;
      }
    } catch (error) {
      console.error('Error dashboard:', error.message);
      toast('Gagal memuat dashboard.', 'error');
    }
  }

  // Render Grafik Kehadiran Tiap Hari (Visual Bar Chart)
  function renderDailyAttendanceChart(allHistory) {
    const chartContainer = $('#dashboardAttendanceChart');
    if (!chartContainer) return;

    // Hitung jumlah kehadiran per tanggal
    const countByDate = {};
    allHistory.forEach(a => {
      const d = a.DATE || todayStr();
      countByDate[d] = (countByDate[d] || 0) + 1;
    });

    // Pastikan hari ini selalu ada dalam list tanggal
    const today = todayStr();
    if (!countByDate[today]) {
      countByDate[today] = attendanceToday.length;
    }

    const sortedDates = Object.keys(countByDate).sort();
    const counts = sortedDates.map(d => countByDate[d]);
    const maxCount = Math.max(...counts, 1);
    const totalAllDays = allHistory.length || attendanceToday.length;

    if ($('#chartTotalBadge')) {
      $('#chartTotalBadge').textContent = `Total: ${totalAllDays} Kehadiran`;
    }

    let barsHtml = '<div class="chart-bars-wrapper">';

    sortedDates.forEach(date => {
      const count = countByDate[date];
      const isToday = date === today;
      const heightPct = Math.max(12, Math.round((count / maxCount) * 100));
      const dateLabel = formatDateShort(date);

      barsHtml += `
        <div class="chart-bar-col">
          <div class="chart-bar-value">${count}</div>
          <div class="chart-bar-fill-track">
            <div class="chart-bar-fill ${isToday ? 'today-bar' : ''}" style="height:${heightPct}%;"></div>
          </div>
          <div class="chart-bar-label ${isToday ? 'fw-700' : ''}">
            ${dateLabel}
            ${isToday ? '<br><span style="font-size:9px;color:var(--c-success);font-weight:700;">Hari Ini</span>' : ''}
          </div>
        </div>
      `;
    });

    barsHtml += '</div>';

    // Footer Legend
    barsHtml += `
      <div class="chart-footer-legend">
        <div class="chart-legend-item">
          <span class="legend-dot dot-past"></span>
          <span>Hari Lain</span>
        </div>
        <div class="chart-legend-item">
          <span class="legend-dot dot-today"></span>
          <span style="font-weight:700;color:var(--c-success);">Hari Ini (${attendanceToday.length} Hadir)</span>
        </div>
        <div class="text-xs text-secondary fw-600">
          ${sortedDates.length} Hari Terdata
        </div>
      </div>
    `;

    chartContainer.innerHTML = barsHtml;
  }

  function updateDashboardStats() {
    const total = participants.length;
    const todayCount = attendanceToday.length;
    const absent = Math.max(0, total - todayCount);
    const percentage = total > 0 ? Math.round((todayCount / total) * 100) : 0;

    $('#statTotal').textContent = total.toLocaleString('id-ID');
    $('#statToday').textContent = todayCount.toLocaleString('id-ID');
    $('#statAbsent').textContent = absent.toLocaleString('id-ID');
    $('#statPercent').textContent = `${percentage}%`;

    const progressEl = $('#statProgress');
    if (progressEl) {
      progressEl.style.width = `${percentage}%`;
    }

    // Render persentase kehadiran breakdown per workshop
    renderWorkshopBreakdown();
  }

  // Render Persentase Kehadiran Breakdown per Workshop
  function renderWorkshopBreakdown() {
    const grid = $('#workshopBreakdownGrid');
    if (!grid) return;

    if (!participants || participants.length === 0) {
      grid.innerHTML = '<div class="loading-state" style="padding:var(--sp-4) 0;"><div class="spinner"></div><span>Memuat data peserta...</span></div>';
      return;
    }

    const checkedIds = new Set((attendanceToday || []).map(a => a.PARTICIPANT_ID));

    // 1. Workshop A
    const enrolledA = participants.filter(p => p.WORKSHOP_A == 1 || p.WORKSHOP_A === '1' || p.WORKSHOP_A === true || String(p.WORKSHOP_A).trim() === '1');
    const attendedA = enrolledA.filter(p => checkedIds.has(p.ID)).length;
    const totalA = enrolledA.length;
    const pctA = totalA > 0 ? Math.round((attendedA / totalA) * 100) : 0;

    // 2. Workshop B
    const enrolledB = participants.filter(p => p.WORKSHOP_B == 1 || p.WORKSHOP_B === '1' || p.WORKSHOP_B === true || String(p.WORKSHOP_B).trim() === '1');
    const attendedB = enrolledB.filter(p => checkedIds.has(p.ID)).length;
    const totalB = enrolledB.length;
    const pctB = totalB > 0 ? Math.round((attendedB / totalB) * 100) : 0;

    // 3. Workshop C
    const enrolledC = participants.filter(p => p.WORKSHOP_C == 1 || p.WORKSHOP_C === '1' || p.WORKSHOP_C === true || String(p.WORKSHOP_C).trim() === '1');
    const attendedC = enrolledC.filter(p => checkedIds.has(p.ID)).length;
    const totalC = enrolledC.length;
    const pctC = totalC > 0 ? Math.round((attendedC / totalC) * 100) : 0;

    // 4. Simposium Saja (Peserta yang tidak mengikuti workshop)
    const enrolledSympo = participants.filter(p => {
      const isA = p.WORKSHOP_A == 1 || p.WORKSHOP_A === '1' || p.WORKSHOP_A === true || String(p.WORKSHOP_A).trim() === '1';
      const isB = p.WORKSHOP_B == 1 || p.WORKSHOP_B === '1' || p.WORKSHOP_B === true || String(p.WORKSHOP_B).trim() === '1';
      const isC = p.WORKSHOP_C == 1 || p.WORKSHOP_C === '1' || p.WORKSHOP_C === true || String(p.WORKSHOP_C).trim() === '1';
      return !isA && !isB && !isC;
    });
    const attendedSympo = enrolledSympo.filter(p => checkedIds.has(p.ID)).length;
    const totalSympo = enrolledSympo.length;
    const pctSympo = totalSympo > 0 ? Math.round((attendedSympo / totalSympo) * 100) : 0;

    const items = [
      {
        code: 'WORKSHOP A',
        codeClass: 'ws-code-a',
        fillClass: 'fill-ws-a',
        name: WORKSHOP_MAPPING.A.name,
        attended: attendedA,
        total: totalA,
        pct: pctA
      },
      {
        code: 'WORKSHOP B',
        codeClass: 'ws-code-b',
        fillClass: 'fill-ws-b',
        name: WORKSHOP_MAPPING.B.name,
        attended: attendedB,
        total: totalB,
        pct: pctB
      },
      {
        code: 'WORKSHOP C',
        codeClass: 'ws-code-c',
        fillClass: 'fill-ws-c',
        name: WORKSHOP_MAPPING.C.name,
        attended: attendedC,
        total: totalC,
        pct: pctC
      },
      {
        code: 'SIMPOSIUM SAJA',
        codeClass: 'ws-code-sympo',
        fillClass: 'fill-ws-sympo',
        name: 'Sesi Simposium (Non-Workshop)',
        attended: attendedSympo,
        total: totalSympo,
        pct: pctSympo
      }
    ];

    let html = '';
    items.forEach(item => {
      const remaining = Math.max(0, item.total - item.attended);
      html += `
        <div class="workshop-stat-card">
          <div class="ws-card-header">
            <div class="ws-card-title-group">
              <span class="ws-badge-code ${item.codeClass}">${item.code}</span>
              <div class="ws-card-name">${escapeHtml(item.name)}</div>
            </div>
            <div class="ws-percentage-badge">${item.pct}%</div>
          </div>
          <div class="ws-progress-track">
            <div class="ws-progress-fill ${item.fillClass}" style="width: ${item.pct}%;"></div>
          </div>
          <div class="ws-metrics-row">
            <div>
              <span class="ws-metrics-attended">${item.attended}</span>
              <span class="ws-metrics-total"> / ${item.total} hadir</span>
            </div>
            <div>
              ${remaining > 0 ? `<span>Belum hadir: <strong>${remaining}</strong></span>` : '<span class="text-success fw-700">✓ Hadir Semua</span>'}
            </div>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  }

  // === ATTENDANCE (CORE CHECK-IN FLOW) ===
  function initAttendance() {
    const date = todayStr();
    $('#attendanceDate').textContent = formatDateWib(date);
    $('#attendanceResults').innerHTML = '';
    $('#attendanceEmpty').style.display = 'none';
    $('#attendanceInitial').style.display = 'block';
    $('#attendanceCheckinResult').style.display = 'none';
    $('#attendanceSearch').value = '';
    $('#attendanceSearch').focus();
  }

  function handleAttendanceSearch() {
    clearTimeout(searchDebounce);
    const query = $('#attendanceSearch').value.trim().toLowerCase();

    if (query.length < 2) {
      $('#attendanceResults').innerHTML = '';
      $('#attendanceEmpty').style.display = 'none';
      $('#attendanceInitial').style.display = query.length === 0 ? 'block' : 'none';
      return;
    }

    searchDebounce = setTimeout(() => {
      $('#attendanceInitial').style.display = 'none';

      const results = participants.filter(p => {
        const name = (p.NAME || '').toLowerCase();
        const phone = (p.PHONE || '').toLowerCase();
        const email = (p.EMAIL || '').toLowerCase();
        const inst = (p.INSTITUTION || '').toLowerCase();
        const id = (p.ID || '').toLowerCase();
        return name.includes(query) || phone.includes(query) || email.includes(query) || inst.includes(query) || id.includes(query);
      }).slice(0, 25);

      if (results.length === 0) {
        $('#attendanceResults').innerHTML = '';
        $('#attendanceEmpty').style.display = 'block';
        return;
      }

      $('#attendanceEmpty').style.display = 'none';

      const checkedMap = new Map();
      attendanceToday.forEach(a => checkedMap.set(a.PARTICIPANT_ID, a.TIME));

      let html = '';
      results.forEach(p => {
        const isChecked = checkedMap.has(p.ID);
        const checkinTime = checkedMap.get(p.ID);
        const initial = getCleanInitial(p.NAME);
        const institution = p.INSTITUTION ? escapeHtml(p.INSTITUTION) : 'Peserta Umum';
        const wsList = getEnrolledWorkshops(p);
        const wsBadge = wsList.length > 0 
          ? `<span class="badge badge-info" style="font-size:11px;font-weight:600;">${escapeHtml(wsList.map(w => w.name).join(' · '))}</span>`
          : '';
        const noteBadge = getNoteBadge(p.NOTE);
        const isVoucher = (p.NOTE || '').toLowerCase().includes('voucher');
        const isCommittee = isCommitteeOrSpecial(p.NOTE);

        let checkinBtnText = 'CHECK IN KEHADIRAN';
        if (isVoucher) {
          checkinBtnText = 'CHECK IN (PERLU VOUCHER)';
        } else if (isCommittee) {
          checkinBtnText = `CHECK IN (${(p.NOTE || 'PANITIA').toUpperCase()})`;
        }

        html += `
          <div class="participant-card" id="att-result-${p.ID}">
            <div class="participant-card-top">
              <div class="participant-avatar">${escapeHtml(initial)}</div>
              <div class="participant-info">
                <div class="participant-name">${escapeHtml(p.NAME)}</div>
                <div class="participant-institution">${institution}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap;">
                  <span class="participant-code">${escapeHtml(p.ID)}</span>
                  ${noteBadge}
                  ${wsBadge}
                  ${p.PHONE ? `<span class="text-xs text-secondary" style="display:inline-flex;align-items:center;gap:4px;font-weight:500;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escapeHtml(p.PHONE)}</span>` : ''}
                </div>
              </div>
            </div>

            <div class="checkin-action-row checkin-btn-wrap-${p.ID}">
              ${isChecked
                ? `
                   <div style="width:100%;">
                     <div class="checked-status-banner">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                       <span>Sudah Hadir (${escapeHtml(formatTimeWib(checkinTime))})</span>
                     </div>
                     <div style="display:flex;gap:6px;margin-top:6px;">
                       <button class="btn btn-secondary btn-sm" onclick="App.viewDetail('${p.ID}')" style="flex:1;">Detail</button>
                       <button class="btn btn-secondary btn-sm" onclick="App.openEditParticipant('${p.ID}')" style="flex:1;">Edit</button>
                       <button class="btn-cancel-absen" onclick="App.openCancelAttendance('${p.ID}')" title="Batalkan absensi jika salah klik">Salah Absen</button>
                     </div>
                   </div>
                  `
                : `
                   <button class="btn btn-checkin-main ${isCommittee ? 'btn-checkin-committee' : ''}" onclick="App.doCheckIn('${p.ID}', this)">
                     ${escapeHtml(checkinBtnText)}
                   </button>
                   <button class="btn btn-secondary btn-sm" onclick="App.viewDetail('${p.ID}')">
                     Detail
                   </button>
                   <button class="btn btn-secondary btn-sm" onclick="App.openEditParticipant('${p.ID}')">
                     Edit
                   </button>
                  `
              }
            </div>
          </div>
        `;
      });

      $('#attendanceResults').innerHTML = html;
    }, 150);
  }

  // === EXECUTE CHECK-IN ===
  async function doCheckIn(participantId, buttonEl) {
    const p = participants.find(item => item.ID === participantId);
    if (!p) return;

    // Cek apakah peserta memiliki ketentuan khusus VOUCHER
    const isVoucher = (p.NOTE || '').toLowerCase().includes('voucher');
    if (isVoucher) {
      const hasVoucher = await showVoucherConfirmation(p);
      if (!hasVoucher) {
        if (buttonEl) {
          buttonEl.disabled = false;
        }
        toast(`Check-in dibatalkan: Voucher untuk ${p.NAME} belum diverifikasi.`, 'warning');
        return;
      }
    }

    // Cek apakah peserta memiliki peran khusus PANITIA / MODERATOR / PEMBICARA
    const isCommittee = isCommitteeOrSpecial(p.NOTE);
    if (isCommittee) {
      const confirmed = await showCommitteeConfirmation(p);
      if (!confirmed) {
        if (buttonEl) {
          buttonEl.disabled = false;
        }
        toast(`Check-in dibatalkan: Konfirmasi untuk ${p.NAME} (${p.NOTE}) dibatalkan.`, 'warning');
        return;
      }
    }

    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.innerHTML = '<span class="spinner spinner-sm spinner-white"></span> Menyimpan...';
    }

    try {
      const result = await API.checkIn(participantId, 'EVT001');

      // Auto-refresh today's attendance data
      try {
        const attResult = await API.getAttendanceToday('EVT001', todayStr());
        attendanceToday = attResult.data || [];
      } catch (_) {}

      const timeStr = formatTimeWib(result.data?.time || new Date().toISOString());
      const dateStr = formatDateWib(result.data?.date || todayStr());
      const wsList = getEnrolledWorkshops(p);
      const wsInfo = wsList.length > 0 
        ? `<div style="margin-top:6px;"><span class="badge badge-info" style="font-size:11px;font-weight:600;">${escapeHtml(wsList.map(w => w.name).join(' · '))}</span></div>`
        : '';
      const voucherBadgeInfo = isVoucher
        ? `<div style="margin-top:6px;"><span class="badge badge-voucher-green" style="font-size:11px;font-weight:700;">✓ Voucher Terverifikasi</span></div>`
        : '';
      const committeeInfo = isCommittee ? getCommitteeRoleInfo(p.NOTE) : null;
      const committeeBadgeInfo = isCommittee
        ? `<div style="margin-top:6px;"><span class="badge badge-panitia" style="font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">${committeeInfo.roleIcon} Kehadiran ${escapeHtml(p.NOTE)} Terverifikasi</span></div>`
        : '';

      // SweetAlert2 Toast/Dialog
      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Check-In Berhasil!',
          html: `
            <div style="text-align:center;margin-top:4px;">
              <h3 style="margin:0 0 6px;font-size:1.15rem;font-weight:700;color:var(--c-text);">${escapeHtml(p.NAME)}</h3>
              <p style="margin:0 0 4px;font-size:0.85rem;color:var(--c-text-secondary);">${escapeHtml(p.INSTITUTION || 'Peserta PIT VIII PAPDI')}</p>
              ${wsInfo}
              ${voucherBadgeInfo}
              ${committeeBadgeInfo}
              <div style="font-size:1.05rem;color:var(--c-text);font-weight:700;font-family:var(--font-mono);margin-top:8px;">
                ${escapeHtml(timeStr)}
              </div>
              <div style="font-size:0.8rem;color:var(--c-text-tertiary);margin-top:2px;">
                ${escapeHtml(dateStr)}
              </div>
            </div>
          `,
          confirmButtonText: 'Selesai',
          confirmButtonColor: '#0F172A',
          timer: 3200,
          timerProgressBar: true
        });
      } else {
        toast(`Check-in berhasil: ${p.NAME} (${timeStr})`, 'success');
      }

      // Update UI Stats & Buttons
      updateDashboardStats();

      // Update card di halaman Absensi
      $$(`.checkin-btn-wrap-${p.ID}`).forEach(wrap => {
        wrap.innerHTML = `
          <div style="width:100%;">
            <div class="checked-status-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              <span>Sudah Hadir (${escapeHtml(timeStr)})</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button class="btn btn-secondary btn-sm" onclick="App.viewDetail('${p.ID}')" style="flex:1;">Detail</button>
              <button class="btn btn-secondary btn-sm" onclick="App.openEditParticipant('${p.ID}')" style="flex:1;">Edit</button>
              <button class="btn-cancel-absen" onclick="App.openCancelAttendance('${p.ID}')" title="Batalkan absensi jika salah klik">Salah Absen</button>
            </div>
          </div>
        `;
      });

      // Update list di halaman Peserta jika aktif
      if (currentPage === 'participants') {
        filterParticipants();
      }

      // Update di halaman detail jika aktif
      if (currentPage === 'participant-detail') {
        const detailAction = $('#detailCheckinAction');
        if (detailAction) {
          detailAction.innerHTML = `
            <div class="checked-status-banner" style="width:100%;padding:12px;font-size:15px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              <span>Sudah Hadir Hari Ini (${escapeHtml(timeStr)})</span>
            </div>
          `;
        }
      }

    } catch (error) {
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.innerHTML = 'CHECK IN KEHADIRAN';
      }

      if (error.code === 'ALREADY_CHECKED_IN') {
        const checkTime = formatTimeWib(error.data?.time);

        if (window.Swal) {
          Swal.fire({
            icon: 'warning',
            title: 'Sudah Check-In Hari Ini',
            html: `
              <div style="text-align:center;margin-top:4px;">
                <h3 style="margin:0 0 6px;font-size:1.15rem;color:var(--c-text);">${escapeHtml(p.NAME)}</h3>
                <p style="font-size:0.9rem;color:var(--c-text-secondary);margin:0;">
                  Peserta sudah tercatat hadir pada pukul <strong>${escapeHtml(checkTime)}</strong>.
                </p>
              </div>
            `,
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#0F172A'
          });
        } else {
          toast(`Peserta sudah check-in pada pukul ${checkTime}`, 'warning');
        }

        $$(`.checkin-btn-wrap-${p.ID}`).forEach(wrap => {
          wrap.innerHTML = `
            <div class="checked-status-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              <span>Sudah Hadir (${escapeHtml(checkTime)})</span>
            </div>
          `;
        });
      } else {
        if (window.Swal) {
          Swal.fire({
            icon: 'error',
            title: 'Check-In Gagal',
            text: error.message || 'Terjadi kesalahan pada server.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0F172A'
          });
        } else {
          toast(error.message || 'Gagal melakukan check-in.', 'error');
        }
      }
    }
  }

  // === PARTICIPANTS LIST & FILTER ===
  function loadParticipants() {
    $('#participantsSearch').value = '';
    filterParticipants();
  }

  function filterParticipants() {
    const query = ($('#participantsSearch').value || '').trim().toLowerCase();
    const checkedIds = new Set(attendanceToday.map(a => a.PARTICIPANT_ID));

    let filtered = participants;

    if (activeParticipantFilter === 'present') {
      filtered = filtered.filter(p => checkedIds.has(p.ID));
    } else if (activeParticipantFilter === 'absent') {
      filtered = filtered.filter(p => !checkedIds.has(p.ID));
    } else if (activeParticipantFilter === 'voucher') {
      filtered = filtered.filter(p => (p.NOTE || '').toLowerCase().includes('voucher'));
    } else if (activeParticipantFilter === 'committee') {
      filtered = filtered.filter(p => isCommitteeOrSpecial(p.NOTE));
    } else if (activeParticipantFilter === 'has-workshop') {
      filtered = filtered.filter(p => p.WORKSHOP_A == 1 || p.WORKSHOP_B == 1 || p.WORKSHOP_C == 1);
    } else if (activeParticipantFilter === 'sympo-only') {
      filtered = filtered.filter(p => !p.WORKSHOP_A && !p.WORKSHOP_B && !p.WORKSHOP_C);
    }

    if (query) {
      filtered = filtered.filter(p => {
        const name = (p.NAME || '').toLowerCase();
        const id = (p.ID || '').toLowerCase();
        const inst = (p.INSTITUTION || '').toLowerCase();
        const phone = (p.PHONE || '').toLowerCase();
        const note = (p.NOTE || '').toLowerCase();
        return name.includes(query) || id.includes(query) || inst.includes(query) || phone.includes(query) || note.includes(query);
      });
    }

    renderParticipantsList(filtered);
    $('#participantsCount').textContent = `Menampilkan ${filtered.length} dari ${participants.length} peserta`;
  }

  function renderParticipantsList(list) {
    if (list.length === 0) {
      $('#participantsList').innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="empty-state-title">Tidak Ada Peserta</div>
          <div class="empty-state-desc">Sesuaikan kata kunci pencarian atau ganti filter di atas.</div>
        </div>
      `;
      return;
    }

    const checkedIds = new Set(attendanceToday.map(a => a.PARTICIPANT_ID));
    let html = '';

    list.forEach(p => {
      const isChecked = checkedIds.has(p.ID);
      const initial = getCleanInitial(p.NAME);
      const institution = p.INSTITUTION ? escapeHtml(p.INSTITUTION) : 'Peserta Umum';
      const wsList = getEnrolledWorkshops(p);
      const wsBadge = wsList.length > 0 
        ? `<span class="badge badge-info" style="font-size:11px;font-weight:600;">${escapeHtml(wsList.map(w => w.name).join(' · '))}</span>`
        : '';
      const noteBadge = getNoteBadge(p.NOTE);
      const isVoucher = (p.NOTE || '').toLowerCase().includes('voucher');
      const isCommittee = isCommitteeOrSpecial(p.NOTE);

      let listBtnText = 'Check In';
      if (isVoucher) {
        listBtnText = 'Check In (Voucher)';
      } else if (isCommittee) {
        listBtnText = `Check In (${p.NOTE})`;
      }

      html += `
        <div class="participant-card">
          <div class="participant-card-top">
            <div class="participant-avatar">${escapeHtml(initial)}</div>
            <div class="participant-info">
              <div class="participant-name">${escapeHtml(p.NAME)}</div>
              <div class="participant-institution">${institution}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap;">
                <span class="participant-code">${escapeHtml(p.ID)}</span>
                ${noteBadge}
                ${wsBadge}
                ${p.PHONE ? `<span class="text-xs text-secondary" style="display:inline-flex;align-items:center;gap:4px;font-weight:500;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escapeHtml(p.PHONE)}</span>` : ''}
              </div>
            </div>
            <span class="badge ${isChecked ? 'badge-success' : 'badge-neutral'}">
              ${isChecked ? '✓ Hadir' : 'Belum Hadir'}
            </span>
          </div>

          <div class="participant-card-bottom">
            <span class="text-xs text-tertiary fw-600">
              ${p.NO ? `No Urut: ${escapeHtml(p.NO)}` : 'Terdaftar'}
            </span>
            <div style="display:flex;gap:var(--sp-2);align-items:center;">
              ${!isChecked 
                ? `<button class="btn btn-primary btn-sm checkin-btn-${p.ID} ${isCommittee ? 'btn-checkin-committee' : ''}" onclick="App.doCheckIn('${p.ID}', this)">${escapeHtml(listBtnText)}</button>` 
                : `<button class="btn-cancel-absen" onclick="App.openCancelAttendance('${p.ID}')" title="Batalkan kehadiran (salah absen)">Salah Absen</button>`
              }
              <button class="btn btn-secondary btn-sm" onclick="App.openEditParticipant('${p.ID}')">Edit</button>
              <button class="btn btn-secondary btn-sm" onclick="App.viewDetail('${p.ID}')">Detail</button>
            </div>
          </div>
        </div>
      `;
    });

    $('#participantsList').innerHTML = html;
  }

  // === PARTICIPANT DETAIL (LANGSUNG NAMA WORKSHOP TANPA KODE / RUANG / WAKTU) ===
  async function loadParticipantDetail(participantId) {
    if (!participantId) return navigate('participants');

    const p = participants.find(item => item.ID === participantId);
    if (!p) {
      toast('Peserta tidak ditemukan.', 'error');
      return navigate('participants');
    }

    const todayAtt = attendanceToday.find(a => a.PARTICIPANT_ID === p.ID);
    const isCheckedIn = Boolean(todayAtt);

    let history = [];
    try {
      const histResult = await API.getAttendanceHistory({ participantId: p.ID, eventId: 'EVT001' });
      history = histResult.data || [];
    } catch (_) {}

    const initial = getCleanInitial(p.NAME);
    const wsList = getEnrolledWorkshops(p);
    const isVoucher = (p.NOTE || '').toLowerCase().includes('voucher');
    const noteBadge = getNoteBadge(p.NOTE);
    const waLink = formatWaLink(p.PHONE);

    let historyHtml = '';
    if (history.length === 0) {
      historyHtml = '<div class="text-xs text-tertiary" style="padding:var(--sp-2) 0;">Belum ada riwayat kehadiran tercatat.</div>';
    } else {
      history.forEach(h => {
        historyHtml += `
          <div class="activity-item" style="justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
              <div class="activity-time">${formatTimeWib(h.TIME)}</div>
              <div class="activity-content">
                <div class="activity-name">${formatDateWib(h.DATE)}</div>
                <div class="activity-desc">Dicatat oleh: ${escapeHtml(h.USER_ID || 'Panitia')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="badge badge-success">✓ Hadir</span>
              <button class="btn-icon-subtle" onclick="App.openEditAttendance('${h.ATTENDANCE_ID}', '${p.ID}')" title="Edit jam absensi" style="padding:4px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon-subtle text-error" onclick="App.openCancelAttendance('${p.ID}', '${h.ATTENDANCE_ID}')" title="Batalkan absensi (salah absen)" style="padding:4px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </button>
            </div>
          </div>
        `;
      });
    }

    // Workshop Enrolled Section (LANGSUNG NAMA WORKSHOP SAJA - TANPA KODE, TANPA RUANG, TANPA WAKTU)
    let workshopSectionHtml = '';
    if (wsList.length > 0) {
      workshopSectionHtml = `
        <div class="workshop-enrolled-list">
          ${wsList.map(ws => `
            <div class="workshop-enrolled-item">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                <div style="width:30px;height:30px;border-radius:8px;background:rgba(14,165,233,0.12);color:var(--c-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <div class="workshop-enrolled-name" style="font-size:13px;font-weight:700;color:var(--c-text);line-height:1.4;">
                  ${escapeHtml(ws.name)}
                </div>
              </div>
              <span class="badge badge-success" style="flex-shrink:0;">✓ Terdaftar</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      workshopSectionHtml = `
        <div class="workshop-none-box">
          <div class="text-sm text-secondary">
            Tidak mengikuti workshop (Hanya Sesi Simposium).
          </div>
        </div>
      `;
    }

    $('#participantDetailContent').innerHTML = `
      <!-- Hero Card Profile with Edit Button -->
      <div class="detail-card">
        <div class="detail-profile-hero" style="justify-content:space-between;align-items:flex-start;">
          <div style="display:flex;gap:var(--sp-4);align-items:center;min-width:0;flex:1;">
            <div class="detail-avatar">${escapeHtml(initial)}</div>
            <div style="min-width:0;flex:1;">
              <div class="detail-name">${escapeHtml(p.NAME)}</div>
              <div class="detail-sub">${escapeHtml(p.INSTITUTION || 'Peserta PIT VIII PAPDI Purwokerto')}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap;">
                <span class="badge ${isCheckedIn ? 'badge-success' : 'badge-neutral'}">${isCheckedIn ? '✓ Sudah Hadir' : 'Belum Hadir'}</span>
                ${noteBadge}
                ${wsList.length > 0 ? `<span class="badge badge-info">${wsList.length} Workshop</span>` : '<span class="badge badge-neutral">Simposium Saja</span>'}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-left:8px;flex-shrink:0;">
            <button class="btn btn-secondary btn-sm" onclick="App.openEditParticipant('${p.ID}')" style="white-space:nowrap;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Edit Peserta</span>
            </button>
            <button class="btn btn-ghost btn-sm text-error" onclick="App.handleDeleteParticipant('${p.ID}')" title="Hapus peserta secara permanen" style="padding:6px 8px;border:1px solid rgba(220,38,38,0.25);border-radius:var(--r-md);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        ${isVoucher ? `
        <div class="voucher-alert-box">
          <div class="voucher-alert-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div class="voucher-alert-title">Perhatian: Wajib Membawa / Memiliki Voucher</div>
            <div class="voucher-alert-desc">Peserta ini berstatus VOUCHER. Panitia wajib memverifikasi bahwa peserta membawa atau memiliki voucher fisik/digital yang sah sebelum mencatat absensi kehadiran.</div>
          </div>
        </div>` : ''}

        ${isCommitteeOrSpecial(p.NOTE) ? `
        <div class="committee-alert-box">
          <div class="committee-alert-icon">
            <span style="font-size:1.4rem;">${getCommitteeRoleInfo(p.NOTE).roleIcon}</span>
          </div>
          <div>
            <div class="committee-alert-title">Peran Khusus: ${escapeHtml(p.NOTE)}</div>
            <div class="committee-alert-desc">
              Peserta terdaftar dengan status resmi <strong>${escapeHtml(p.NOTE)}</strong> pada PIT VIII PAPDI Purwokerto 2026. Pencatatan absensi kehadiran memerlukan konfirmasi panitia.
            </div>
          </div>
        </div>` : ''}

        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">ID Peserta</span>
            <span class="detail-val font-mono">${escapeHtml(p.ID)}</span>
          </div>
          ${p.NO ? `
          <div class="detail-row">
            <span class="detail-label">Nomor Urut</span>
            <span class="detail-val font-mono">${escapeHtml(p.NO)}</span>
          </div>` : ''}
          <div class="detail-row" style="align-items:center;">
            <span class="detail-label">Nomor WhatsApp / HP</span>
            <span class="detail-val">
              ${p.PHONE ? `
                <div class="phone-action-row">
                  <span class="font-mono" style="font-weight:700;">${escapeHtml(p.PHONE)}</span>
                  <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn-phone-wa" title="Buka percakapan WhatsApp">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    <span>Chat WA</span>
                  </a>
                  <button type="button" class="btn-phone-copy" onclick="App.copyPhone('${escapeHtml(p.PHONE)}')" title="Salin nomor">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Salin</span>
                  </button>
                </div>
              ` : '<span class="text-tertiary">- Tidak ada nomor</span>'}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Catatan (Note)</span>
            <span class="detail-val">
              ${p.NOTE ? `
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
                  ${noteBadge}
                  <span>${escapeHtml(p.NOTE)}</span>
                </div>
              ` : '<span class="text-tertiary">-</span>'}
            </span>
          </div>
          ${p.PRODUCT ? `
          <div class="detail-row">
            <span class="detail-label">Kategori Tiket</span>
            <span class="detail-val">${escapeHtml(p.PRODUCT)}</span>
          </div>` : ''}
          ${p.EMAIL ? `
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-val">${escapeHtml(p.EMAIL)}</span>
          </div>` : ''}
        </div>
      </div>

      <!-- Workshop Enrolled Card -->
      <div class="detail-card">
        <div class="section-heading" style="margin-bottom:var(--sp-3);display:flex;align-items:center;justify-content:space-between;">
          <span>Workshop yang Diikuti</span>
          <div style="display:flex;align-items:center;gap:6px;">
            ${wsList.length > 0 
              ? `<span class="badge badge-info">${wsList.length} Workshop Terdaftar</span>` 
              : `<span class="badge badge-neutral">Hanya Simposium</span>`
            }
            <button class="btn btn-ghost btn-sm" onclick="App.openEditParticipant('${p.ID}')" style="font-size:11px;padding:2px 6px;">Ubah</button>
          </div>
        </div>
        ${workshopSectionHtml}
      </div>

      <!-- Check-In Action Card (Single Unified Attendance) -->
      <div class="detail-card">
        <div class="section-heading" style="margin-bottom:var(--sp-3);display:flex;align-items:center;justify-content:space-between;">
          <span>Status Kehadiran Hari Ini</span>
          ${isCheckedIn ? `<span class="text-xs text-secondary font-mono">${formatTimeWib(todayAtt?.TIME)}</span>` : ''}
        </div>
        <div id="detailCheckinAction">
          ${isCheckedIn
            ? `
              <div class="checked-status-banner" style="width:100%;padding:12px;font-size:15px;margin-bottom:12px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span>Sudah Hadir Hari Ini (${escapeHtml(formatTimeWib(todayAtt?.TIME))})</span>
              </div>
              <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="App.openEditAttendance('${todayAtt?.ATTENDANCE_ID}', '${p.ID}')" style="flex:1;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Edit Jam Hadir</span>
                </button>
                <button class="btn btn-danger btn-sm" onclick="App.openCancelAttendance('${p.ID}', '${todayAtt?.ATTENDANCE_ID}')" style="flex:1;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span>Batalkan Hadir (Salah Absen)</span>
                </button>
              </div>
            `
            : `<button class="btn btn-primary btn-lg btn-full ${isCommitteeOrSpecial(p.NOTE) ? 'btn-checkin-committee' : ''}" onclick="App.doCheckIn('${p.ID}', this)">
                ${isVoucher ? 'CHECK IN KEHADIRAN (VERIFIKASI VOUCHER)' : (isCommitteeOrSpecial(p.NOTE) ? `CHECK IN KEHADIRAN (${(p.NOTE || 'PANITIA').toUpperCase()})` : 'CHECK IN KEHADIRAN SEKARANG')}
               </button>`
          }
        </div>
      </div>

      <!-- Attendance History Card -->
      <div class="detail-card">
        <div class="section-heading" style="margin-bottom:var(--sp-3);">Riwayat Kehadiran</div>
        <div class="activity-feed" style="border:none;box-shadow:none;">
          ${historyHtml}
        </div>
      </div>
    `;
  }

  function viewDetail(participantId) {
    navigate('participant-detail', { id: participantId });
  }

  // Helper to sync visual checked class on workshop cards
  function syncChoiceCards(prefix) {
    ['Sympo', 'WorkshopA', 'WorkshopB', 'WorkshopC'].forEach(key => {
      const input = $(`#${prefix}${key}`);
      if (input) {
        const card = input.closest('.ws-choice-card');
        if (card) {
          if (input.checked) card.classList.add('checked');
          else card.classList.remove('checked');
        }
      }
    });
  }

  // === ADD PARTICIPANT ===
  function openAddParticipant() {
    $('#addParticipantModal').style.display = 'flex';
    $('#addParticipantForm').reset();
    if ($('#addSympo')) $('#addSympo').checked = true;
    if ($('#addWorkshopA')) $('#addWorkshopA').checked = false;
    if ($('#addWorkshopB')) $('#addWorkshopB').checked = false;
    if ($('#addWorkshopC')) $('#addWorkshopC').checked = false;
    if ($('#addVoucherCheck')) {
      $('#addVoucherCheck').checked = false;
      const vCard = $('#addVoucherCheck').closest('.voucher-toggle-card');
      if (vCard) vCard.classList.remove('checked');
    }
    syncChoiceCards('add');
    $('#addDuplicateWarning').style.display = 'none';
    $('#addName').focus();
  }

  async function handleAddParticipant(checkInNow) {
    const name = $('#addName').value.trim();
    if (!name) {
      toast('Nama peserta wajib diisi.', 'error');
      $('#addName').focus();
      return;
    }

    const wsA = $('#addWorkshopA')?.checked ? 1 : 0;
    const wsB = $('#addWorkshopB')?.checked ? 1 : 0;
    const wsC = $('#addWorkshopC')?.checked ? 1 : 0;
    const sympo = $('#addSympo')?.checked ? 1 : 0;

    let product = $('#addProduct').value.trim();
    if (!product) {
      if (wsA || wsB || wsC) {
        product = 'Simposium dan Workshop';
      } else {
        product = 'Simposium Saja';
      }
    }

    let note = ($('#addNote')?.value || '').trim();
    const hasVoucher = Boolean($('#addVoucherCheck')?.checked);
    if (hasVoucher) {
      if (!note.toLowerCase().includes('voucher')) {
        note = note ? `Voucher, ${note}` : 'Voucher';
      }
    }

    const data = {
      name,
      phone: $('#addPhone').value.trim(),
      institution: $('#addInstitution').value.trim(),
      email: $('#addEmail').value.trim(),
      product,
      sympo,
      workshopA: wsA,
      workshopB: wsB,
      workshopC: wsC,
      note,
      checkInNow
    };

    const btn = checkInNow ? $('#addSaveAbsenBtn') : $('#addSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm spinner-white"></span> Menyimpan...';

    try {
      const result = await API.addParticipant(data);
      $('#addParticipantModal').style.display = 'none';

      // Reload participants
      const pResult = await API.getParticipants();
      participants = pResult.data || [];

      if (checkInNow && result.data?.participant) {
        doCheckIn(result.data.participant.ID);
      } else {
        toast('Peserta baru berhasil ditambahkan!', 'success');
      }

      filterParticipants();
      updateDashboardStats();
    } catch (error) {
      toast(error.message || 'Gagal menambahkan peserta.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = checkInNow ? 'Simpan & Absen Hadir' : 'Simpan';
    }
  }

  // === EDIT PARTICIPANT (TAMBAH / GANTI WORKSHOP / EDIT SEMUA DETAIL) ===
  function openEditParticipant(participantId) {
    const p = participants.find(item => item.ID === participantId);
    if (!p) {
      toast('Data peserta tidak ditemukan.', 'error');
      return;
    }

    $('#editParticipantId').value = p.ID;
    $('#editName').value = p.NAME || '';
    $('#editNo').value = p.NO || '';
    $('#editPhone').value = p.PHONE || '';
    $('#editInstitution').value = p.INSTITUTION || '';
    $('#editEmail').value = p.EMAIL || '';
    $('#editProduct').value = p.PRODUCT || '';

    const isVoucher = (p.NOTE || '').toLowerCase().includes('voucher');
    if ($('#editVoucherCheck')) {
      $('#editVoucherCheck').checked = isVoucher;
      const vCard = $('#editVoucherCheck').closest('.voucher-toggle-card');
      if (vCard) {
        if (isVoucher) vCard.classList.add('checked');
        else vCard.classList.remove('checked');
      }
    }

    // Bersihkan kata voucher dari tampilan input catatan tambahan agar tidak dobel
    let displayNote = p.NOTE || '';
    if (isVoucher) {
      displayNote = displayNote
        .replace(/\b(perlu\s+)?voucher\b/gi, '')
        .replace(/^[\s,;]+|[\s,;]+$/g, '')
        .replace(/,\s*,/g, ',')
        .trim();
    }
    $('#editNote').value = displayNote;

    const isA = p.WORKSHOP_A == 1 || p.WORKSHOP_A === '1' || p.WORKSHOP_A === true || String(p.WORKSHOP_A).trim() === '1';
    const isB = p.WORKSHOP_B == 1 || p.WORKSHOP_B === '1' || p.WORKSHOP_B === true || String(p.WORKSHOP_B).trim() === '1';
    const isC = p.WORKSHOP_C == 1 || p.WORKSHOP_C === '1' || p.WORKSHOP_C === true || String(p.WORKSHOP_C).trim() === '1';
    const isSympo = p.SYMPO == 1 || p.SYMPO === '1' || p.SYMPO === true || (!isA && !isB && !isC);

    if ($('#editWorkshopA')) $('#editWorkshopA').checked = isA;
    if ($('#editWorkshopB')) $('#editWorkshopB').checked = isB;
    if ($('#editWorkshopC')) $('#editWorkshopC').checked = isC;
    if ($('#editSympo')) $('#editSympo').checked = isSympo;
    syncChoiceCards('edit');

    $('#editParticipantModal').style.display = 'flex';
    $('#editName').focus();
  }

  async function handleSaveEditParticipant() {
    const id = $('#editParticipantId').value;
    const name = $('#editName').value.trim();
    if (!name) {
      toast('Nama peserta wajib diisi.', 'error');
      $('#editName').focus();
      return;
    }

    const wsA = $('#editWorkshopA')?.checked ? 1 : 0;
    const wsB = $('#editWorkshopB')?.checked ? 1 : 0;
    const wsC = $('#editWorkshopC')?.checked ? 1 : 0;
    const sympo = $('#editSympo')?.checked ? 1 : 0;

    let product = $('#editProduct').value.trim();
    if (!product) {
      if (wsA || wsB || wsC) {
        product = 'Simposium dan Workshop';
      } else {
        product = 'Simposium Saja';
      }
    }

    let noteVal = $('#editNote').value.trim();
    const hasVoucher = Boolean($('#editVoucherCheck')?.checked);
    if (hasVoucher) {
      if (!noteVal.toLowerCase().includes('voucher')) {
        noteVal = noteVal ? `Voucher, ${noteVal}` : 'Voucher';
      }
    } else {
      noteVal = noteVal
        .replace(/\b(perlu\s+)?voucher\b/gi, '')
        .replace(/^[\s,;]+|[\s,;]+$/g, '')
        .replace(/,\s*,/g, ',')
        .trim();
    }

    const data = {
      name,
      no: $('#editNo').value ? Number($('#editNo').value) : null,
      phone: $('#editPhone').value.trim(),
      institution: $('#editInstitution').value.trim(),
      email: $('#editEmail').value.trim(),
      product,
      sympo,
      workshopA: wsA,
      workshopB: wsB,
      workshopC: wsC,
      note: noteVal
    };

    const btn = $('#editSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm spinner-white"></span> Menyimpan...';

    try {
      const res = await API.updateParticipant(id, data);
      const updated = res.data;

      // Update in memory participants
      const idx = participants.findIndex(p => p.ID === id);
      if (idx !== -1) {
        participants[idx] = { ...participants[idx], ...updated };
      }

      $('#editParticipantModal').style.display = 'none';

      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Data Berhasil Diperbarui',
          text: `Detail peserta ${updated.NAME} telah disimpan.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        toast('Data peserta berhasil disimpan.', 'success');
      }

      updateDashboardStats();
      if (currentPage === 'participants') filterParticipants();
      if (currentPage === 'participant-detail') loadParticipantDetail(id);
      if (currentPage === 'attendance') handleAttendanceSearch();

    } catch (err) {
      toast(err.message || 'Gagal menyimpan perubahan peserta.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Simpan Perubahan';
    }
  }

  // === DELETE PARTICIPANT (ADMIN / PANITIA) ===
  async function handleDeleteParticipant(participantId) {
    const p = participants.find(item => item.ID === participantId);
    const pName = p ? p.NAME : (participantId || 'Peserta');

    let confirmed = false;
    if (window.Swal) {
      const res = await Swal.fire({
        icon: 'warning',
        title: 'Hapus Peserta Secara Permanen?',
        html: `
          <div style="text-align:center;margin-top:6px;">
            <p style="font-size:15px;color:var(--c-text);margin-bottom:8px;">
              Apakah Anda yakin ingin menghapus data peserta:
            </p>
            <div style="font-size:16px;font-weight:700;color:var(--c-error);margin-bottom:4px;">
              ${escapeHtml(pName)} (${escapeHtml(participantId)})
            </div>
            <p style="font-size:12px;color:var(--c-error);margin-top:8px;line-height:1.5;">
              Data peserta dan seluruh riwayat absensinya akan dihapus secara permanen dari database.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '✕ Ya, Hapus Permanen',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#64748B',
        reverseButtons: true
      });
      confirmed = res.isConfirmed;
    } else {
      confirmed = window.confirm(`Hapus peserta ${pName} (${participantId}) secara permanen? Data absensi terkait juga akan dihapus.`);
    }

    if (!confirmed) return;

    try {
      if (window.Swal) {
        Swal.fire({
          title: 'Menghapus Peserta...',
          text: 'Mohon tunggu sebentar',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
      }

      await API.deleteParticipant(participantId);

      // Remove from in-memory lists
      participants = participants.filter(item => item.ID !== participantId);
      attendanceToday = attendanceToday.filter(a => a.PARTICIPANT_ID !== participantId);

      // Close modal if open
      $('#editParticipantModal').style.display = 'none';

      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Peserta Berhasil Dihapus',
          text: `Data ${pName} telah dihapus dari sistem.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        toast(`Peserta ${pName} berhasil dihapus.`, 'success');
      }

      updateDashboardStats();

      // Navigate appropriately
      if (currentPage === 'participant-detail') {
        navigate('participants');
      } else if (currentPage === 'participants') {
        filterParticipants();
      } else if (currentPage === 'attendance') {
        handleAttendanceSearch();
      } else if (currentPage === 'history') {
        loadHistory();
      } else if (currentPage === 'dashboard') {
        loadDashboard();
      }

    } catch (err) {
      if (window.Swal) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menghapus',
          text: err.message || 'Terjadi kesalahan saat menghapus peserta.'
        });
      } else {
        toast(err.message || 'Gagal menghapus peserta.', 'error');
      }
    }
  }

  // === CANCEL ATTENDANCE (SALAH ABSEN) ===
  async function openCancelAttendance(participantId, attendanceId) {
    const p = participants.find(item => item.ID === participantId);
    const pName = p ? p.NAME : (participantId || 'Peserta');

    let confirmed = false;
    if (window.Swal) {
      const res = await Swal.fire({
        icon: 'warning',
        title: 'Batalkan Kehadiran Peserta?',
        html: `
          <div style="text-align:center;margin-top:6px;">
            <p style="font-size:15px;color:var(--c-text);margin-bottom:8px;">
              Apakah Anda yakin ingin membatalkan absensi untuk:
            </p>
            <div style="font-size:16px;font-weight:700;color:var(--c-accent);margin-bottom:4px;">
              ${escapeHtml(pName)}
            </div>
            <p style="font-size:12px;color:var(--c-error);margin-top:8px;">
              Status kehadiran peserta akan kembali menjadi <strong>Belum Hadir</strong>.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '✕ Ya, Batalkan (Salah Absen)',
        cancelButtonText: 'Kembali',
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#64748B',
        reverseButtons: true
      });
      confirmed = res.isConfirmed;
    } else {
      confirmed = window.confirm(`Batalkan kehadiran untuk ${pName}? Status akan kembali menjadi Belum Hadir.`);
    }

    if (!confirmed) return;

    try {
      const today = todayStr();
      await API.cancelCheckIn(participantId, today);

      // Remove from local attendanceToday
      attendanceToday = attendanceToday.filter(a => a.PARTICIPANT_ID !== participantId);

      // Refresh in background
      try {
        const attRes = await API.getAttendanceToday('EVT001', today);
        attendanceToday = attRes.data || [];
      } catch (_) {}

      // Close modal if open
      $('#editAttendanceModal').style.display = 'none';

      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Absensi Dibatalkan',
          text: `Status ${pName} telah dikembalikan menjadi Belum Hadir.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        toast(`Absensi ${pName} dibatalkan.`, 'success');
      }

      updateDashboardStats();
      if (currentPage === 'attendance') handleAttendanceSearch();
      if (currentPage === 'participants') filterParticipants();
      if (currentPage === 'participant-detail') loadParticipantDetail(participantId);
      if (currentPage === 'history') loadHistory();
      if (currentPage === 'dashboard') loadDashboard();

    } catch (err) {
      toast(err.message || 'Gagal membatalkan absensi.', 'error');
    }
  }

  // === EDIT ATTENDANCE (JAM / TANGGAL / DETAIL) ===
  function openEditAttendance(attendanceId, participantId) {
    let att = null;
    if (attendanceId) {
      att = attendanceToday.find(a => a.ATTENDANCE_ID === attendanceId);
    }
    if (!att && participantId) {
      att = attendanceToday.find(a => a.PARTICIPANT_ID === participantId);
    }

    const p = participants.find(item => item.ID === (att?.PARTICIPANT_ID || participantId));
    if (!p) {
      toast('Data peserta tidak ditemukan.', 'error');
      return;
    }

    $('#editAttendanceId').value = att?.ATTENDANCE_ID || '';
    $('#editAttendanceParticipantId').value = p.ID;
    $('#editAttendanceParticipantName').textContent = p.NAME;
    $('#editAttendanceParticipantInst').textContent = p.INSTITUTION || 'Peserta PIT VIII PAPDI';

    const curDate = att?.DATE || todayStr();
    let curTime = att?.TIME || '';
    const m = String(curTime).match(/^(\d{1,2}):(\d{2})/);
    if (m) {
      curTime = `${m[1].padStart(2, '0')}:${m[2]}`;
    }

    $('#editAttendanceDate').value = curDate;
    $('#editAttendanceTime').value = curTime || '08:00';

    $('#editAttendanceModal').style.display = 'flex';
    $('#editAttendanceTime').focus();
  }

  async function handleSaveEditAttendance() {
    const attId = $('#editAttendanceId').value;
    const participantId = $('#editAttendanceParticipantId').value;
    const date = $('#editAttendanceDate').value;
    const time = $('#editAttendanceTime').value.trim();

    if (!time) {
      toast('Waktu kehadiran wajib diisi.', 'error');
      $('#editAttendanceTime').focus();
      return;
    }

    const btn = $('#editAttendanceSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm spinner-white"></span> Menyimpan...';

    try {
      if (attId) {
        await API.updateAttendance(attId, { date, time });
      } else if (participantId) {
        await API.checkIn(participantId, 'EVT001');
      }

      const attRes = await API.getAttendanceToday('EVT001', todayStr());
      attendanceToday = attRes.data || [];

      $('#editAttendanceModal').style.display = 'none';
      toast('Data absensi berhasil diperbarui.', 'success');

      updateDashboardStats();
      if (currentPage === 'participant-detail') loadParticipantDetail(participantId);
      if (currentPage === 'history') loadHistory();
      if (currentPage === 'attendance') handleAttendanceSearch();

    } catch (err) {
      toast(err.message || 'Gagal menyimpan perubahan absensi.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Simpan Koreksi';
    }
  }

  function handleDuplicateCheck() {
    const name = $('#addName').value.trim().toLowerCase();
    const warning = $('#addDuplicateWarning');

    if (name.length < 3) {
      warning.style.display = 'none';
      return;
    }

    const duplicate = participants.find(p => (p.NAME || '').toLowerCase() === name);

    if (duplicate) {
      warning.style.display = 'block';
      warning.innerHTML = `
        <div style="background:var(--c-warning-bg);color:var(--c-warning);padding:var(--sp-3);border-radius:var(--r-md);font-size:var(--fs-xs);">
          <strong>Perhatian:</strong> Peserta dengan nama "<strong>${escapeHtml(duplicate.NAME)}</strong>" (${duplicate.ID}) sudah ada.
        </div>
      `;
    } else {
      warning.style.display = 'none';
    }
  }

  // === HISTORY ===
  async function loadHistory() {
    const dateFilter = $('#historyDate').value;
    const searchFilter = ($('#historySearch').value || '').trim().toLowerCase();

    if (!participants || participants.length === 0) {
      try {
        const pRes = await API.getParticipants();
        participants = pRes.data || [];
      } catch (_) {}
    }

    const params = { eventId: 'EVT001' };
    if (dateFilter) params.date = dateFilter;

    $('#historyList').innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Memuat riwayat...</span></div>';

    try {
      const result = await API.getAttendanceHistory(params);
      let history = result.data || [];

      if (searchFilter) {
        history = history.filter(h => {
          const p = participants.find(item => item.ID === h.PARTICIPANT_ID);
          const name = (p?.NAME || h.PARTICIPANT_NAME || '').toLowerCase();
          const id = (h.PARTICIPANT_ID || '').toLowerCase();
          return name.includes(searchFilter) || id.includes(searchFilter);
        });
      }

      if ($('#historyCount')) {
        $('#historyCount').textContent = `Total: ${history.length} catatan kehadiran`;
      }

      if (history.length === 0) {
        $('#historyList').innerHTML = `
          <div class="empty-state-card">
            <div class="empty-state-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="empty-state-title">Tidak Ada Catatan Kehadiran</div>
            <div class="empty-state-desc">${dateFilter ? `Tidak ada absensi pada tanggal ${formatDateWib(dateFilter)}.` : 'Belum ada data kehadiran yang tercatat.'}</div>
          </div>
        `;
        return;
      }

      let html = '';
      history.forEach(h => {
        const p = participants.find(item => item.ID === h.PARTICIPANT_ID);
        const name = p ? p.NAME : (h.PARTICIPANT_NAME || h.PARTICIPANT_ID);
        const inst = p && p.INSTITUTION ? p.INSTITUTION : 'Peserta PIT VIII PAPDI';
        const timeDisplay = formatTimeWib(h.TIME);
        const dateDisplay = formatDateWib(h.DATE);

        html += `
          <div class="history-card">
            <div class="history-card-time">
              <span class="history-time-hour">${escapeHtml(timeDisplay.replace(' WIB', ''))}</span>
              <span class="history-time-zone">WIB</span>
            </div>
            <div class="history-card-body">
              <div class="history-card-name">${escapeHtml(name)}</div>
              <div class="history-card-meta">
                <span>${escapeHtml(inst)}</span> · <span>${escapeHtml(dateDisplay)}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <span class="badge badge-success">✓ Hadir</span>
              <button class="btn-icon-subtle" onclick="App.openEditAttendance('${h.ATTENDANCE_ID}', '${h.PARTICIPANT_ID}')" title="Edit jam absensi" style="padding:4px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon-subtle text-error" onclick="App.openCancelAttendance('${h.PARTICIPANT_ID}', '${h.ATTENDANCE_ID}')" title="Batalkan absensi (salah absen)" style="padding:4px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </button>
            </div>
          </div>
        `;
      });

      $('#historyList').innerHTML = html;
    } catch (error) {
      $('#historyList').innerHTML = `<div class="empty-state-card"><div class="empty-state-title">Gagal Memuat Riwayat</div></div>`;
      toast('Gagal memuat riwayat.', 'error');
    }
  }

  // === REPORTS (FIXED ALL REPORT TYPES) ===
  async function loadReport() {
    const type = $('#reportType').value;
    const startDate = $('#reportStartDate').value;
    const endDate = $('#reportEndDate').value;

    $('#reportContent').innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Menyiapkan data laporan...</span></div>';

    try {
      const params = { eventId: 'EVT001', type };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const result = await API.getReports(params);
      const data = result.data || [];

      if (type === 'daily') {
        renderDailyReport(data);
      } else if (type === 'recap') {
        renderRecapReport(data);
      } else if (type === 'participants') {
        renderParticipantsReport(data);
      } else if (type === 'panitia') {
        renderPanitiaReport(data);
      } else {
        renderDailyReport(data);
      }
    } catch (error) {
      $('#reportContent').innerHTML = `<div class="empty-state-card"><div class="empty-state-title">Gagal Menyiapkan Laporan</div><div class="empty-state-desc">${escapeHtml(error.message || 'Periksa koneksi.')}</div></div>`;
      toast('Gagal memuat laporan.', 'error');
    }
  }

  function renderDailyReport(data) {
    if (data.length === 0) {
      $('#reportContent').innerHTML = '<div class="empty-state-card"><div class="empty-state-title">Tidak Ada Data Absensi</div><div class="empty-state-desc">Belum ada absensi pada periode yang dipilih.</div></div>';
      return;
    }

    let html = '<div class="data-table-scroll"><table class="data-table"><thead><tr><th>No</th><th>Nama Peserta</th><th>Instansi</th><th>Tanggal</th><th>Jam (WIB)</th><th>Status</th></tr></thead><tbody>';

    data.forEach((row, i) => {
      const p = participants.find(item => item.ID === row.PARTICIPANT_ID);
      html += `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:700;">${escapeHtml(p?.NAME || row.PARTICIPANT_NAME || row.PARTICIPANT_ID)}</td>
        <td>${escapeHtml(p?.INSTITUTION || row.INSTITUTION || '—')}</td>
        <td>${formatDateWib(row.DATE)}</td>
        <td style="font-family:var(--font-mono);font-weight:700;">${formatTimeWib(row.TIME)}</td>
        <td><span class="badge badge-success">✓ Hadir</span></td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    $('#reportContent').innerHTML = html;
  }

  function renderRecapReport(data) {
    if (data.length === 0) {
      $('#reportContent').innerHTML = '<div class="empty-state-card"><div class="empty-state-title">Tidak Ada Data Rekap</div></div>';
      return;
    }

    let html = '<div class="data-table-scroll"><table class="data-table"><thead><tr><th>No</th><th>ID</th><th>Nama Peserta</th><th>Instansi</th><th>Status</th><th>Total Kehadiran</th><th>Tanggal Hadir</th></tr></thead><tbody>';

    data.forEach((row, i) => {
      const isPresent = row.STATUS === 'HADIR';
      html += `<tr>
        <td>${row.NO || i + 1}</td>
        <td style="font-family:var(--font-mono);font-weight:600;">${escapeHtml(row.ID)}</td>
        <td style="font-weight:700;">${escapeHtml(row.NAME)}</td>
        <td>${escapeHtml(row.INSTITUTION || '—')}</td>
        <td><span class="badge ${isPresent ? 'badge-success' : 'badge-neutral'}">${isPresent ? '✓ Hadir' : 'Belum Hadir'}</span></td>
        <td style="font-family:var(--font-mono);font-weight:700;">${row.TOTAL_HADIR || 0} kali</td>
        <td>${escapeHtml(row.DATES_ATTENDED || '—')}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    $('#reportContent').innerHTML = html;
  }

  function renderParticipantsReport(data) {
    const list = data.length > 0 ? data : participants;
    if (list.length === 0) {
      $('#reportContent').innerHTML = '<div class="empty-state-card"><div class="empty-state-title">Tidak Ada Data Peserta</div></div>';
      return;
    }

    let html = '<div class="data-table-scroll"><table class="data-table"><thead><tr><th>No</th><th>ID</th><th>Nama Peserta</th><th>Instansi</th><th>WhatsApp / HP</th><th>Catatan (Note)</th><th>Workshop Terdaftar</th><th>Status Hadir</th></tr></thead><tbody>';

    list.forEach((p, i) => {
      const wsList = getEnrolledWorkshops(p);
      const wsText = wsList.length > 0 ? wsList.map(w => w.name).join(' & ') : '—';
      const isPresent = p.ATTENDANCE_STATUS === 'HADIR';
      const noteBadge = p.NOTE ? getNoteBadge(p.NOTE) : '—';

      html += `<tr>
        <td>${p.NO || i + 1}</td>
        <td style="font-family:var(--font-mono);font-weight:600;">${escapeHtml(p.ID)}</td>
        <td style="font-weight:700;">${escapeHtml(p.NAME)}</td>
        <td>${escapeHtml(p.INSTITUTION || '—')}</td>
        <td>${escapeHtml(p.PHONE || '—')}</td>
        <td>${noteBadge}</td>
        <td style="font-size:12px;">${escapeHtml(wsText)}</td>
        <td><span class="badge ${isPresent ? 'badge-success' : 'badge-neutral'}">${isPresent ? '✓ Hadir' : 'Belum Hadir'}</span></td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    $('#reportContent').innerHTML = html;
  }

  function renderPanitiaReport(data) {
    if (data.length === 0) {
      $('#reportContent').innerHTML = '<div class="empty-state-card"><div class="empty-state-title">Tidak Ada Data Panitia</div></div>';
      return;
    }

    let html = '<div class="data-table-scroll"><table class="data-table"><thead><tr><th>No</th><th>User ID</th><th>Nama Panitia</th><th>Username</th><th>Status Akun</th><th>Total Check-In yang Dicatat</th></tr></thead><tbody>';

    data.forEach((u, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td style="font-family:var(--font-mono);font-weight:600;">${escapeHtml(u.USER_ID)}</td>
        <td style="font-weight:700;">${escapeHtml(u.NAME)}</td>
        <td>${escapeHtml(u.USERNAME)}</td>
        <td><span class="badge ${u.STATUS === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}">${escapeHtml(u.STATUS)}</span></td>
        <td style="font-family:var(--font-mono);font-weight:700;">${u.TOTAL_CHECKIN || 0} peserta</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    $('#reportContent').innerHTML = html;
  }

  async function handleExportReport() {
    try {
      $('#reportExportBtn').disabled = true;
      $('#reportExportBtn').innerHTML = '<span class="spinner spinner-sm spinner-white"></span> Mengunduh...';
      await API.exportExcel('EVT001');
      toast('Laporan Excel berhasil diunduh.', 'success');
    } catch (error) {
      toast('Gagal mengunduh Excel.', 'error');
    } finally {
      $('#reportExportBtn').disabled = false;
      $('#reportExportBtn').innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Export Excel</span>
      `;
    }
  }

  // === GLOBAL EXPORTS ===
  window.App = {
    navigate,
    doCheckIn,
    viewDetail,
    openAddParticipant,
    openEditParticipant,
    handleDeleteParticipant,
    openCancelAttendance,
    openEditAttendance,
    copyPhone: (phone) => copyToClipboard(phone, 'Nomor HP')
  };

  document.addEventListener('DOMContentLoaded', init);
})();

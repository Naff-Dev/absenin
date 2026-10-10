-- ========================================================
-- Schema Database Supabase / PostgreSQL untuk Absenin
-- PIT VIII PAPDI Purwokerto 2026
-- ========================================================

-- 1. Tabel EVENT
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    location TEXT,
    status TEXT DEFAULT 'ACTIVE'
);

-- 2. Tabel PANITIA
CREATE TABLE IF NOT EXISTS panitia (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE'
);

-- 3. Tabel WORKSHOPS
CREATE TABLE IF NOT EXISTS workshops (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT,
    time TEXT,
    room TEXT,
    quota INTEGER DEFAULT 50,
    status TEXT DEFAULT 'ACTIVE'
);

-- 4. Tabel PARTICIPANTS (PESERTA)
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    no INTEGER,
    name TEXT NOT NULL,
    phone TEXT,
    institution TEXT,
    email TEXT,
    product TEXT,
    sympo INTEGER DEFAULT 1,
    workshop_a INTEGER DEFAULT 0,
    workshop_b INTEGER DEFAULT 0,
    workshop_c INTEGER DEFAULT 0,
    note TEXT,
    source TEXT DEFAULT 'MANUAL',
    created_at TEXT,
    updated_at TEXT
);

-- Index pencarian peserta
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
CREATE INDEX IF NOT EXISTS idx_participants_no ON participants(no);

-- 5. Tabel ATTENDANCE (ABSENSI SIMPOSIUM)
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    user_id TEXT,
    status TEXT DEFAULT 'HADIR',
    CONSTRAINT uq_attendance_participant_date UNIQUE(event_id, participant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event_date ON attendance(event_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_participant ON attendance(participant_id);

-- 6. Tabel WORKSHOP_ATTENDANCE (ABSENSI WORKSHOP)
CREATE TABLE IF NOT EXISTS workshop_attendance (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    workshop_code TEXT NOT NULL REFERENCES workshops(code) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    user_id TEXT,
    CONSTRAINT uq_wa_participant_workshop_date UNIQUE(event_id, participant_id, workshop_code, date)
);

CREATE INDEX IF NOT EXISTS idx_wa_event_workshop ON workshop_attendance(event_id, workshop_code);
CREATE INDEX IF NOT EXISTS idx_wa_participant ON workshop_attendance(participant_id);

-- 7. Tabel LOGS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS logs (
    log_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    participant_id TEXT,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

-- ========================================================
-- DATA SEED AWAL
-- ========================================================

-- Seed Event
INSERT INTO events (event_id, event_name, start_date, end_date, location, status)
VALUES ('EVT001', 'PIT VIII PAPDI Purwokerto 2026', '2026-03-01', '2026-03-03', 'Purwokerto', 'ACTIVE')
ON CONFLICT (event_id) DO NOTHING;

-- Seed Panitia
INSERT INTO panitia (user_id, name, username, password, status)
VALUES 
    ('USR001', 'Panitia Utama', 'admin', 'password123', 'ACTIVE'),
    ('USR002', 'Panitia Absensi', 'panitia', 'password123', 'ACTIVE'),
    ('USR003', 'Akun Nonaktif', 'nonaktif', 'password123', 'INACTIVE'),
    ('USR004', 'Panitia Utama 1', 'absen1', 'password234', 'ACTIVE'),
    ('USR005', 'Panitia Utama 2', 'absen2', 'password234', 'ACTIVE'),
    ('USR006', 'Panitia Utama 3', 'absen3', 'password234', 'ACTIVE'),
    ('USR007', 'Panitia Utama 4', 'absen4', 'password234', 'ACTIVE'),
    ('USR008', 'Panitia Utama 5', 'absen5', 'password234', 'ACTIVE'),
    ('USR009', 'Panitia Utama 6', 'absen6', 'password234', 'ACTIVE'),
    ('USR010', 'Panitia Utama 7', 'absen7', 'password234', 'ACTIVE'),
    ('USR011', 'Panitia Utama 8', 'absen8', 'password234', 'ACTIVE'),
    ('USR012', 'Panitia Utama 9', 'absen9', 'password234', 'ACTIVE'),
    ('USR013', 'Panitia Utama 10', 'absen10', 'password234', 'ACTIVE'),
    ('USR014', 'Panitia Utama (Alias)', 'absen', 'password234', 'ACTIVE')
ON CONFLICT (user_id) DO NOTHING;

-- Seed Workshops
INSERT INTO workshops (code, name, date, time, room, quota, status)
VALUES
    ('W01', 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION', '2026-03-01', '08:00 - 12:00', 'Ruang A', 50, 'ACTIVE'),
    ('W02', 'BEDSIDE ULTRASOUND IN CRITICAL CARE', '2026-03-01', '13:00 - 17:00', 'Ruang B', 50, 'ACTIVE'),
    ('W03', 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS', '2026-03-02', '08:00 - 12:00', 'Ruang C', 40, 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

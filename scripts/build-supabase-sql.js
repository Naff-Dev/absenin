const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/db.json');
const outputPath = path.resolve(__dirname, '../database/supabase-schema.sql');

if (!fs.existsSync(dbPath)) {
  console.error('db.json tidak ditemukan di', dbPath);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function sqlNum(val, def = 0) {
  const n = Number(val);
  return isNaN(n) ? def : n;
}

let sql = `-- ========================================================
-- Schema Database Supabase / PostgreSQL untuk Absenin
-- PIT VIII PAPDI Purwokerto 2026
-- ========================================================

-- 1. TABEL EVENT
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    location TEXT,
    status TEXT DEFAULT 'ACTIVE'
);

-- 2. TABEL PANITIA
CREATE TABLE IF NOT EXISTS panitia (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE'
);

-- 3. TABEL WORKSHOPS
CREATE TABLE IF NOT EXISTS workshops (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT,
    time TEXT,
    room TEXT,
    quota INTEGER DEFAULT 50,
    status TEXT DEFAULT 'ACTIVE'
);

-- 4. TABEL PARTICIPANTS (PESERTA)
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

CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
CREATE INDEX IF NOT EXISTS idx_participants_no ON participants(no);

-- 5. TABEL ATTENDANCE (ABSENSI SIMPOSIUM)
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

-- 6. TABEL WORKSHOP_ATTENDANCE (ABSENSI WORKSHOP)
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

-- 7. TABEL LOGS (AUDIT TRAIL)
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
-- KEAMANAN / PERMISSIONS (SUPABASE RLS & ANON ACCESS)
-- Pastikan anon key dan server dapat membaca & menulis data
-- ========================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access events" ON events;
CREATE POLICY "Public full access events" ON events FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE panitia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access panitia" ON panitia;
CREATE POLICY "Public full access panitia" ON panitia FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access workshops" ON workshops;
CREATE POLICY "Public full access workshops" ON workshops FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access participants" ON participants;
CREATE POLICY "Public full access participants" ON participants FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access attendance" ON attendance;
CREATE POLICY "Public full access attendance" ON attendance FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE workshop_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access workshop_attendance" ON workshop_attendance;
CREATE POLICY "Public full access workshop_attendance" ON workshop_attendance FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access logs" ON logs;
CREATE POLICY "Public full access logs" ON logs FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE events TO anon, authenticated, service_role;
GRANT ALL ON TABLE panitia TO anon, authenticated, service_role;
GRANT ALL ON TABLE workshops TO anon, authenticated, service_role;
GRANT ALL ON TABLE participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE workshop_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE logs TO anon, authenticated, service_role;

-- ========================================================
-- SEED DATA AWAL
-- ========================================================

-- 1. Seed Event
INSERT INTO events (event_id, event_name, start_date, end_date, location, status)
VALUES ('EVT001', 'PIT VIII PAPDI Purwokerto 2026', '2026-03-01', '2026-03-03', 'Purwokerto', 'ACTIVE')
ON CONFLICT (event_id) DO UPDATE SET
    event_name = EXCLUDED.event_name,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    location = EXCLUDED.location,
    status = EXCLUDED.status;

-- 2. Seed Panitia (14 Akun)
INSERT INTO panitia (user_id, name, username, password, status)
VALUES
`;

const panitiaValues = (db.panitia || []).map(p =>
  `    (${sqlStr(p.USER_ID)}, ${sqlStr(p.NAME)}, ${sqlStr(p.USERNAME)}, ${sqlStr(p.PASSWORD)}, ${sqlStr(p.STATUS || 'ACTIVE')})`
).join(',\n');

sql += panitiaValues + `
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    status = EXCLUDED.status;

-- 3. Seed Workshops
INSERT INTO workshops (code, name, date, time, room, quota, status)
VALUES
`;

const wsValues = (db.workshops || []).map(w =>
  `    (${sqlStr(w.CODE)}, ${sqlStr(w.NAME)}, ${sqlStr(w.DATE)}, ${sqlStr(w.TIME)}, ${sqlStr(w.ROOM)}, ${sqlNum(w.QUOTA, 50)}, ${sqlStr(w.STATUS || 'ACTIVE')})`
).join(',\n');

sql += wsValues + `
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    date = EXCLUDED.date,
    time = EXCLUDED.time,
    room = EXCLUDED.room,
    quota = EXCLUDED.quota,
    status = EXCLUDED.status;

-- 4. Seed Peserta Resmi (${(db.participants || []).length} Peserta)
INSERT INTO participants (id, no, name, phone, institution, email, product, sympo, workshop_a, workshop_b, workshop_c, note, source, created_at, updated_at)
VALUES
`;

const pValues = (db.participants || []).map(p =>
  `    (${sqlStr(p.ID)}, ${sqlNum(p.NO)}, ${sqlStr(p.NAME)}, ${sqlStr(p.PHONE || '')}, ${sqlStr(p.INSTITUTION || '')}, ${sqlStr(p.EMAIL || '')}, ${sqlStr(p.PRODUCT || '')}, ${sqlNum(p.SYMPO, 1)}, ${sqlNum(p.WORKSHOP_A, 0)}, ${sqlNum(p.WORKSHOP_B, 0)}, ${sqlNum(p.WORKSHOP_C, 0)}, ${sqlStr(p.NOTE || '')}, ${sqlStr(p.SOURCE || 'IMPORT')}, ${sqlStr(p.CREATED_AT || '')}, ${sqlStr(p.UPDATED_AT || '')})`
).join(',\n');

sql += pValues + `
ON CONFLICT (id) DO UPDATE SET
    no = EXCLUDED.no,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    institution = EXCLUDED.institution,
    email = EXCLUDED.email,
    product = EXCLUDED.product,
    sympo = EXCLUDED.sympo,
    workshop_a = EXCLUDED.workshop_a,
    workshop_b = EXCLUDED.workshop_b,
    workshop_c = EXCLUDED.workshop_c,
    note = EXCLUDED.note,
    source = EXCLUDED.source,
    updated_at = EXCLUDED.updated_at;
`;

fs.writeFileSync(outputPath, sql, 'utf8');
console.log('✓ Selesai membuat ' + outputPath + ' (' + sql.length + ' bytes, ' + (db.participants || []).length + ' peserta)');

-- ========================================================
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
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    status = EXCLUDED.status;

-- 3. Seed Workshops
INSERT INTO workshops (code, name, date, time, room, quota, status)
VALUES
    ('W01', 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION', '2026-03-01', '08:00 - 12:00', 'Ruang A', 50, 'ACTIVE'),
    ('W02', 'BEDSIDE ULTRASOUND IN CRITICAL CARE', '2026-03-01', '13:00 - 17:00', 'Ruang B', 50, 'ACTIVE'),
    ('W03', 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS', '2026-03-02', '08:00 - 12:00', 'Ruang C', 40, 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    date = EXCLUDED.date,
    time = EXCLUDED.time,
    room = EXCLUDED.room,
    quota = EXCLUDED.quota,
    status = EXCLUDED.status;

-- 4. Seed Peserta Resmi (210 Peserta)
INSERT INTO participants (id, no, name, phone, institution, email, product, sympo, workshop_a, workshop_b, workshop_c, note, source, created_at, updated_at)
VALUES
    ('P001', 1, 'dr Leo Chandra Wisnu Pandu Winata Sp.PD M.Kes', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P002', 2, 'dr. Hengki S Permana Putra, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P003', 3, 'Johannes dimas aditya', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P004', 4, 'Yusuf Adi Gunawan', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P005', 5, 'Luthfia jannah', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P006', 6, 'Anita Rahmawati', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P007', 7, 'dr. Rakhmat Tajudin, SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P008', 8, 'Dr Haidar Alatas', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P009', 9, 'Triwidya Putri Mawarsari', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P010', 10, 'Arif Zulfian Mubarok', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P011', 11, 'Yosefin Ratnaningtyas', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P012', 12, 'Tiara Paramita Poernomo', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P013', 13, 'Niken Febriharsari', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P014', 14, 'dr SASONGKO HADIPURNOMO MSc SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P015', 15, 'Gandik Danu Pramiga', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P016', 16, 'Andi Manaek Hatimbulan Panjaitan', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P017', 17, 'dr Indra Adhi Nugraha,SpPD FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P018', 18, 'dr.Siti Muzayyanah, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P019', 19, 'Dr. Nani Widorini SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P020', 20, 'fakhri', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P021', 21, 'Hary Sulaksono Adi', '085206082143', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P022', 22, 'dr. Syanindita Puspa Wardhani, M.Biomed', '081234063364', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P023', 23, 'Veramita Nanda Pradana', '081227528339', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P024', 24, 'Anugerah Wahyu Adi Prasetyo', '089515552348', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P025', 25, 'Rizky Amalia Hidayat', '082242827257', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P026', 26, 'dr. FIRDOUS NURROHMAN', '082134283192', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P027', 27, 'I Dewa Ayu Mirah Pramesti Putri', '081327702015', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P028', 28, 'Yusuf Annafi Firdaus', '08112616393', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P029', 29, 'dr.Djoni Gunata', '081902910789', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P030', 30, 'Akhdan Baghaskara Rahmatullah', '08218082728', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P031', 31, 'Reynaldo Binsar Hutajulu, dr., Sp.PD', '082182601560', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P032', 32, 'dr.Diaga Landau', '081313953136', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P033', 33, 'dr.Hendrawan Ariwibowo', '085600357546', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P034', 34, 'dr.Rudianto', '085726069699', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P035', 35, 'Bella Rizky Rahmawati Guntur', '085291911171', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P036', 36, 'Nanda Kurniawan', '08112999769', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P037', 37, 'Delta Iswara', '0895320677035', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P038', 38, 'dr.Lintang Ayu Novia Anwar', '083134507500', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P039', 39, 'dr. Ahmad Hermanto MM', '081328245000', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P040', 40, 'Induwidi Quamilla Renggani', '085712191917', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P041', 41, 'dr.Ria Pusparini', '08569977724', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P042', 42, 'dr.Jose Adelina', '082177091377', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P043', 43, 'dr Marini Hendarwati', '082225498743', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'voucher', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P044', 44, 'dr. H.R. Prabata, M.M.R., CHQP', '081227832014', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P045', 45, 'dr. Ninik Lestari Handayani', '08121563532', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P046', 46, 'dr. Dany Sastra Chandranata', '085351151170', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P047', 47, 'dr. Andreas Dewa Setiawan', '082134144553', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P048', 48, 'dr. Bram Adhitama', '081220657936', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P049', 49, 'dr. Rima Siti Rohimah', '082139962472', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P050', 50, 'dr. Rahmat Santosa, Sp.PD', '081327692143', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P051', 51, 'siti chodariyah', '082135930199', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P052', 52, 'Shanti Kirana', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P053', 53, 'Rachmad aji saksana', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P054', 54, 'nirwan fathur rahman', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P055', 55, 'Elisabet Ratri Pangestuti', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P056', 56, 'Dicky Bramantyo Agung Prakoso', '085811122174', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P057', 57, 'dr. Widi Nur Wicaksana', '085642617749', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'voucher', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P058', 58, 'dr. Prasojo Adi', '083840647220', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P059', 59, 'dr Marwanto SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P060', 60, 'adrea jane putri susanto', '081298962440', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P061', 61, 'dr Devi Nurul Baeti, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P062', 62, 'Mukti Sadewo', '081770599036', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P063', 63, 'Yosefin Ratnaningtyas', '082221834862', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P064', 64, 'Akhmad syaifullah', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P065', 65, 'Fitri Nadia Widyasari', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P066', 66, 'Sinta Aji Arirukmi', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P067', 67, 'Andreas', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P068', 68, 'TRI AGUS WIBOWO', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P069', 69, 'NUR WAHID', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P070', 70, 'Budi Laksono', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P071', 71, 'dr Hanifan Danu Wijaya Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P072', 72, 'dr.agus susanto,Sp.PD FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P073', 73, 'Gigih Rahmandanu Poernomo', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P074', 74, 'Alvin Aditya Setiawan', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P075', 75, 'dr. Vitis Arundina, M.Kes, ADWM, Dipl. CIBTAC', '081231253605', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P076', 76, 'dr. Heppy Oktavianto, M.Sc., Sp.PD, Subsp.PTI(K), FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P077', 77, 'dr. Rizki Andarista Pramesti', '082136166449', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P078', 78, 'dr. Maslahatul Khoeriyah, M.P.H', '081391391410', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P079', 79, 'dr. Himawan Surya sembada', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P080', 80, 'dr Suprapto, SpPD, FINASIM', '082226834549', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P081', 81, 'Dr. Irianta dwi poedja saputra ., SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P082', 82, 'Rano Ismail', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P083', 83, 'dr.Pranawa Sri Hapsara', '082242523425', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P084', 84, 'dr Ranggit Oktanita', '085640547870', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P085', 85, 'dr Dino Hendarto', '081280554568', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P086', 86, 'SIGIT DWIYANTO', '085647656757', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P087', 87, 'NISWATI SYARIFAH ANWAR', '081215894009', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P088', 88, 'Octaviena', '087738808218', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P089', 89, 'Andy Yulianto', '081224821369', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P090', 90, 'Dr. Sigit Purnomohadi, SpPD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P091', 91, 'Suwarto', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P092', 92, 'dr. DHIKA TRIESNIA SAGITA Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P093', 93, 'Hanif Haidaryafi', '089907159072', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P094', 94, 'Ganis Irawan', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P095', 95, 'Dwi Yuliawati', '081317170775', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P096', 96, 'DWI RETNO SETIJATI', '081327181688', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P097', 97, 'dr Tjong Michella Florencia', '082227288333', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P098', 98, 'FATICHA AINUR AZZAHROH', '088210776317', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'voucher', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P099', 99, 'dr. Yoga Mulia Pratama, Sp.P.D.', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P100', 100, 'Dr. TRI TJAHJONO BUDI WALUJO , SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P101', 101, 'Stonia Ellen Listyaningrum', '085729289815', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P102', 102, 'Lilis Indri Astuti', '082141139803', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P103', 103, 'dr. Nur Ika Setyowati Anggraeni', '085225987729', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P104', 104, 'Muhammad Zulfani Najmi', '087868181874', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P105', 105, 'Anita Valine Utami', '081210110655', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P106', 106, 'dr. Chaerani Kurniatin', '081388209412', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P107', 107, 'Dara Aisyah Rahayu Abdurrachman', '082242141965', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P108', 108, 'Nurul Afiati', '08976885650', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P109', 109, 'dr. Filly Ulfa Kusumawardani', '081327544097', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P110', 110, 'Fauziah Rizki Ismaulidiya', '082138382248', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P111', 111, 'Ardila Putri Prabangkari', '085227712938', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P112', 112, 'Pradani Eva Adiningtyas', '0895385069443', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P113', 113, 'dr. Yuvana Dewanti', '089609656660', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P114', 114, 'Dr. RUMI SEKARSATI, SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P115', 115, 'Dr. HERY AGOESTONO , SpPD, K-GEH', '', '', '', '', 1, 1, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P116', 116, 'dr Eva Kardiono Sirojo', '082121798710', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P117', 117, 'A. Naesaburi Sahid', '082240630443', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P118', 118, 'Rizko Putra Pradana', '08112641503', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P119', 119, 'Nida Shofiyya Amalina', '082111858525', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P120', 120, 'Camelia Dwijayanti', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P121', 121, 'Irwan Arif Margono', '085291379164', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P122', 122, 'Widhi Prassiddha Sunu', '085229566279', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P123', 123, 'Dita Wahyu Rahman', '082225128250', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P124', 124, 'dr Anton Sunaryo', '0811277232', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P125', 125, 'Diyan Ayu Pertiwi', '085799271170', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P126', 126, 'Meinar Triardhani', '085290270120', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P127', 127, 'dr. Ery Rosita', '081804797735', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P128', 128, 'Ani Setiyowati', '082137379634', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P129', 129, 'dr. Arinta Dewi Prasetyanti', '085640147068', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P130', 130, 'Alifah Wahyu Widiasih', '089608584767', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P131', 131, 'dr. Mona Montaz', '083149389374', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P132', 132, 'dr. Varian Primada Jaya Sp.PD, FINASIM', '082220042539', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P133', 133, 'Anik Puspitasari', '081237469998', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P134', 134, 'bangun dwi laksana', '082225153082', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P135', 135, 'Dr. GEDE PERDANA PUTERA , Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P136', 136, 'Dr. YUNANTO DWI NUGROHO, SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P137', 137, 'dr. Hyang Iman Akbar Saputra', '085791244034', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P138', 138, 'Dr. SRI LESTARI , SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P139', 139, 'Dr. PUGUD SAMODRO , SpPD', '', '', '', 'Simposium', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P140', 140, 'Dr. MAYA DEWI , SpPD,', '', '', '', 'Simposium', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P141', 141, 'Dr. GHEA DE SILVA , SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P142', 142, 'Dr. MA''MUN , M.Sc, Sp,PD', '', '', '', 'Simposium', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P143', 143, 'Dr. INDRA SETYA PERMANA , SpPD.', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P144', 144, 'Dr. FEBRI KURNIAWATI , Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P145', 145, 'dr. Ika Trisnawati, Sp.PD', '', '', '', 'Simposium', 1, 0, 0, 0, 'pembicara', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P146', 146, 'dr. Eko Budiono, Sp.PD', '', '', '', 'Simposium', 1, 0, 0, 0, 'pembicara', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P147', 147, 'dr. Ni Ketut Donna Prisilia T, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P148', 148, 'dr. Suharno, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P149', 149, 'dr. Kukuh Prasetyo, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P150', 150, 'dr. Aditiawarman, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P151', 151, 'dr. Aditya Candra Putra, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P152', 152, 'dr. Maschun Sarifudin, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P153', 153, 'dr. Lincah Angger Wismo Asih', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P154', 154, 'dr. Joko Rilo Pambudi, Sp.PD, K-R', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P155', 155, 'Dr. dr. Arifin, Sp.PD, K-IC', '', '', '', 'Simposium', 1, 0, 0, 0, 'pembicara', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P156', 156, 'dr. Maela Rustiana Dewi, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P157', 157, 'DR. RIAN MA.RUFI, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P158', 158, 'dr. Danang Setyawan', '081317874150', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P159', 159, 'dr. Henny  Eka Setyawati', '081327354164', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P160', 160, 'Suryadi', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P161', 161, 'M. Aulady Rifki Kamal', '085156916548', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P162', 162, 'Dr. ANDIANTO , SpPD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P163', 163, 'Dr. ENDANG SRI UNTARI , SpPD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P164', 164, 'dr. Gigih Fitriawan, SpPD', '081329421452', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P165', 165, 'Rahmawati', '085321591126', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P166', 166, 'dr. Anggita Budi Wahyono', '082131030341', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P167', 167, 'Yona Ajeng Triafatma', '08112812085', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P168', 168, 'Aditya Kristiaji', '081542277084', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P169', 169, 'Widi Palupi Ayu Padmandani', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P170', 170, 'Dr. WAHYU DJATMIKO , SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P171', 171, 'Dr. I GEDE ARINTON , SpPD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P172', 172, 'dr. Yuniar Rachmad Wijayanto, Sp.An', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P173', 173, 'Ismuhartinah', '081327458607', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P174', 174, 'Grahita Anindita Poernomo', '081387582649', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P175', 175, 'dr. Anwar Hudiono, M. P. H.', '082220301930', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P176', 176, 'dr. Lily Kusumasita Burkon, M.K.K.', '08170615856', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P177', 177, 'Afra Bryges Tamia', '082225973246', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P178', 178, 'dr.Tantra Dewi Rahardyanti', '081215204691', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P179', 179, 'dr. Puspa ayu lestari', '081390901241', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P180', 180, 'Puspita Arum', '085229300023', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P181', 181, 'Muhammad Al Farizi Ganda Saputra', '082242297770', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P182', 182, 'Ali Said', '085803485114', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P183', 183, 'Fakikha Aditami', '081251510076', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P184', 184, 'dr. Ajeng Destian S,Mbiomed (AAAM)', '082243570471', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P185', 185, 'dr. Gerry Febrian Rizaldy, Sp.PD', '081239779800', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P186', 186, 'Dr. IMAM MUKTIADI , Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P187', 187, 'Nabila Putri Maharani', '082135113728', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P188', 188, 'Deby Wicaksono Septyandaru', '0895422917778', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P189', 189, 'Jihan Fatmawati', '085747706133', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P190', 190, 'Shanti Kirana', '085229697826', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'anggota PAPDI', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P191', 191, 'dr Dia Irawati, Sp.PD, M.Kes', '082328010440', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P192', 192, 'dr.Rundito,M.Biomed', '081804727239', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P193', 193, 'Satria Lutfi Hanata Samudra', '081392507794', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P194', 194, 'I Ngurah Ardhi Wiratama', '081325380014', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P195', 195, 'dr. Adelia Budhie Puspita Sari', '0811272232', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'voucher', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P196', 196, 'Devi Yuliana Suhardi', '085701415177', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P197', 197, 'Bella Septiani Br Turnip', '087892504447', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P198', 198, 'Mega Putri Kusuma Dewi', '081327058687', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P199', 199, 'Dionisius Halim Kusuma Wardhana', '08997906168', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P200', 200, 'Kartika Aridini', '0895377346495', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P201', 201, 'Sheila Fiona', '082138064866', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P202', 202, 'dr Novia Etty Parmawati SpPD FINASIM', '081228444699', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P203', 203, 'dr Herni Setiyowati', '081391025003', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P204', 204, 'dr.Lusi Yelena', '08164221356', '', '', 'simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P205', 205, 'dr Anjar Budi Astoro, SpPD,  FINASIM', '081328591175', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P206', 206, 'dr. Afan Deni Wikanta', '085327192446', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P207', 207, 'Amjad Hibatullah', '0895341303995', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P208', 208, 'Milla Bella Imbrany', '082114498034', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P209', 209, 'dr Iin Setiyana', '085973186704', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42'),
    ('P210', 210, 'dr Irvan Dwi Cahyono', '085744190794', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-10 08:42', '2026-10-10 08:42')
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

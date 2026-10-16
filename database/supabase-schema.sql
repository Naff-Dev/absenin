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
    ('W01', 'OSTEOARTHRITIS & INTRA-ARTICULAR INJECTION', '2026-10-17', '08:00 - 12:00', 'Ruang Workshop A', 80, 'ACTIVE'),
    ('W02', 'BEDSIDE ULTRASOUND IN CRITICAL CARE', '2026-10-17', '13:00 - 17:00', 'Ruang Workshop B', 90, 'ACTIVE'),
    ('W03', 'PRACTICAL ECHOCARDIOGRAPHY FOR CLINICIANS', '2026-10-18', '08:00 - 12:00', 'Ruang Workshop C', 50, 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    date = EXCLUDED.date,
    time = EXCLUDED.time,
    room = EXCLUDED.room,
    quota = EXCLUDED.quota,
    status = EXCLUDED.status;

-- 4. Seed Peserta Resmi (243 Peserta)
INSERT INTO participants (id, no, name, phone, institution, email, product, sympo, workshop_a, workshop_b, workshop_c, note, source, created_at, updated_at)
VALUES
    ('P001', 1, 'dr. Leo Chandra Wisnu PW, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Panitia', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P002', 2, 'dr. Hengki S Permana Putra, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Panitia', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P003', 3, 'Johannes dimas aditya', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P004', 4, 'Yusuf Adi Gunawan', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P005', 5, 'Luthfia jannah', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P006', 6, 'Anita Rahmawati', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P007', 7, 'dr. Rakhmat Tajudin, SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P008', 8, 'Dr. dr. Haidar Alatas, MH, MM, Sp.PD, K-GH, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P009', 9, 'Triwidya Putri Mawarsari', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P010', 10, 'Arif Zulfian Mubarok', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P011', 11, 'dr. Yosefin Ratnaningtyas, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P012', 12, 'dr. Tiara Paramita Poernomo, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Panitia', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P013', 13, 'dr. Niken Febriharsari. Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P014', 14, 'dr SASONGKO HADIPURNOMO MSc SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P015', 15, 'dr. Gandik Danu Pramiga, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P016', 16, 'Andi Manaek Hatimbulan Panjaitan', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P017', 17, 'dr Indra Adhi Nugraha,SpPD FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P018', 18, 'dr.Siti Muzayyanah, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P019', 19, 'Dr. Nani Widorini SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P020', 20, 'fakhri', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P021', 21, 'Hary Sulaksono Adi', '085206082143', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P022', 22, 'dr. Syanindita Puspa Wardhani, M.Biomed', '081234063364', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P023', 23, 'Veramita Nanda Pradana', '081227528339', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P024', 24, 'Anugerah Wahyu Adi Prasetyo', '089515552348', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P025', 25, 'Rizky Amalia Hidayat', '082242827257', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P026', 26, 'dr. FIRDOUS NURROHMAN', '082134283192', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P027', 27, 'I Dewa Ayu Mirah Pramesti Putri', '081327702015', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P028', 28, 'Yusuf Annafi Firdaus', '08112616393', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P029', 29, 'dr.Djoni Gunata', '081902910789', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P030', 30, 'Akhdan Baghaskara Rahmatullah', '08218082728', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P031', 31, 'dr. Reynaldo Binsar Hutajulu, Sp.PD', '082182601560', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P032', 32, 'dr.Diaga Landau', '081313953136', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P033', 33, 'dr.Hendrawan Ariwibowo', '085600357546', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P034', 34, 'dr.Rudianto', '085726069699', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P035', 35, 'Bella Rizky Rahmawati Guntur', '085291911171', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P036', 36, 'Nanda Kurniawan', '08112999769', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P037', 37, 'Delta Iswara', '0895320677035', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P038', 38, 'dr.Lintang Ayu Novia Anwar', '083134507500', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P039', 39, 'dr. Ahmad Hermanto MM', '081328245000', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P040', 40, 'Induwidi Quamilla Renggani', '085712191917', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P041', 41, 'dr.Ria Pusparini', '08569977724', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P042', 42, 'dr.Jose Adelina', '082177091377', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P043', 43, 'dr Marini Hendarwati', '082225498743', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'voucher', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P044', 44, 'dr. H.R. Prabata, M.M.R., CHQP', '081227832014', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P045', 45, 'dr. Ninik Lestari Handayani', '08121563532', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P046', 46, 'dr. Dany Sastra Chandranata', '085351151170', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P047', 47, 'dr. Andreas Dewa Setiawan', '082134144553', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P048', 48, 'dr. Bram Adhitama', '081220657936', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P049', 49, 'dr. Rima Siti Rohimah', '082139962472', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P050', 50, 'dr. Rahmat Santosa, Sp.PD', '081327692143', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P051', 51, 'siti chodariyah', '082135930199', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P052', 52, 'Shanti Kirana', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P053', 53, 'dr. Rachmad Aji Saksana, M.Sc, Sp.PD, Subsp.PMK.(K), FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Pembicara, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P054', 54, 'nirwan fathur rahman', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P055', 55, 'Elisabet Ratri Pangestuti', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P056', 56, 'Dicky Bramantyo Agung Prakoso', '085811122174', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P057', 57, 'dr. Widi Nur Wicaksana', '085642617749', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'voucher', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P058', 58, 'dr. Prasojo Adi', '083840647220', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P059', 59, 'dr Marwanto SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P060', 60, 'adrea jane putri susanto', '081298962440', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P061', 61, 'dr Devi Nurul Baeti, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P062', 62, 'Mukti Sadewo', '081770599036', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P063', 63, 'dr. Yosefin Ratnaningtyas, Sp.PD', '082221834862', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P064', 64, 'Akhmad syaifullah', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P065', 65, 'dr. Fitri Nadia Widyasari, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P066', 66, 'Sinta Aji Arirukmi', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P067', 67, 'Andreas', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P068', 68, 'TRI AGUS WIBOWO', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P069', 69, 'NUR WAHID', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P070', 70, 'Budi Laksono', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P071', 71, 'dr Hanifan Danu Wijaya Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P072', 72, 'dr.agus susanto,Sp.PD FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P073', 73, 'dr. Gigih Rahmandanu Poernomo, M.Kes, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P074', 74, 'dr. Alvin Aditya Setiawan, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Panitia', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P075', 75, 'dr. Vitis Arundina, M.Kes, ADWM, Dipl. CIBTAC', '081231253605', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P076', 76, 'dr. Heppy Oktavianto, M.Sc, Sp.PD, Subsp.PTI.(K), FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P077', 77, 'dr. Rizki Andarista Pramesti', '082136166449', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P078', 78, 'dr. Maslahatul Khoeriyah, M.P.H', '081391391410', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P079', 79, 'dr. Himawan Surya sembada', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P080', 80, 'dr Suprapto, SpPD, FINASIM', '082226834549', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P081', 81, 'Dr. Irianta dwi poedja saputra ., SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P082', 82, 'Rano Ismail', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P083', 83, 'dr.Pranawa Sri Hapsara', '082242523425', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P084', 84, 'dr Ranggit Oktanita', '085640547870', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P085', 85, 'dr Dino Hendarto', '081280554568', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P086', 86, 'SIGIT DWIYANTO', '085647656757', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P087', 87, 'NISWATI SYARIFAH ANWAR', '081215894009', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P088', 88, 'Octaviena', '087738808218', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P089', 89, 'Andy Yulianto', '081224821369', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P090', 90, 'Dr. Sigit Purnomohadi, SpPD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P091', 91, 'Suwarto', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P092', 92, 'dr. DHIKA TRIESNIA SAGITA Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P093', 93, 'Hanif Haidaryafi', '089907159072', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P094', 94, 'Ganis Irawan', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P095', 95, 'Dwi Yuliawati', '081317170775', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P096', 96, 'DWI RETNO SETIJATI', '081327181688', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P097', 97, 'dr Tjong Michella Florencia', '082227288333', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P098', 98, 'FATICHA AINUR AZZAHROH', '088210776317', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'voucher', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P099', 99, 'dr. Yoga Mulia Pratama, Sp.P.D.', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P100', 100, 'Dr. TRI TJAHJONO BUDI WALUJO , SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P101', 101, 'Stonia Ellen Listyaningrum', '085729289815', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P102', 102, 'Lilis Indri Astuti', '082141139803', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P103', 103, 'dr. Nur Ika Setyowati Anggraeni', '085225987729', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P104', 104, 'Muhammad Zulfani Najmi', '087868181874', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P105', 105, 'Anita Valine Utami', '081210110655', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P106', 106, 'dr. Chaerani Kurniatin', '081388209412', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P107', 107, 'Dara Aisyah Rahayu Abdurrachman', '082242141965', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P108', 108, 'Nurul Afiati', '08976885650', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P109', 109, 'dr. Filly Ulfa Kusumawardani', '081327544097', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P110', 110, 'Fauziah Rizki Ismaulidiya', '082138382248', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P111', 111, 'Ardila Putri Prabangkari', '085227712938', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P112', 112, 'Pradani Eva Adiningtyas', '0895385069443', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P113', 113, 'dr. Yuvana Dewanti', '089609656660', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P114', 114, 'Dr. RUMI SEKARSATI, SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P115', 115, 'dr. Hery Agoestono, Sp.PD, K-GEH, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P116', 116, 'dr Eva Kardiono Sirojo', '082121798710', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P117', 117, 'A. Naesaburi Sahid', '082240630443', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P118', 118, 'Rizko Putra Pradana', '08112641503', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P119', 119, 'Nida Shofiyya Amalina', '082111858525', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P120', 120, 'Camelia Dwijayanti', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P121', 121, 'Irwan Arif Margono', '085291379164', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P122', 122, 'Widhi Prassiddha Sunu', '085229566279', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P123', 123, 'Dita Wahyu Rahman', '082225128250', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P124', 124, 'dr Anton Sunaryo', '0811277232', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P125', 125, 'Diyan Ayu Pertiwi', '085799271170', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P126', 126, 'Meinar Triardhani', '085290270120', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P127', 127, 'dr. Ery Rosita', '081804797735', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P128', 128, 'Ani Setiyowati', '082137379634', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P129', 129, 'dr. Arinta Dewi Prasetyanti', '085640147068', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P130', 130, 'Alifah Wahyu Widiasih', '089608584767', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P131', 131, 'dr. Mona Montaz', '083149389374', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P132', 132, 'dr. Varian Primada Jaya Sp.PD, FINASIM', '082220042539', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P133', 133, 'Anik Puspitasari', '081237469998', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P134', 134, 'bangun dwi laksana', '082225153082', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P135', 135, 'dr. Gede Perdana Putera, Sp.PD, Subsp.R(K), M.Biomed', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Panitia, Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P136', 136, 'dr. Yunanto Dwi Nugroho, M.Sc, Sp.PD, K-GH', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia, Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P137', 137, 'dr. Hyang Iman Akbar Saputra', '085791244034', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P138', 138, 'dr. Sri Lestari, Sp.PD, Subsp.GH(K), FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P139', 139, 'DR. dr. Pugud Samodro, Sp.PD, K-EMD, FINASIM', '', '', '', 'Simposium', 1, 0, 0, 0, 'Panitia, Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P140', 140, 'dr. Maya Dewi, Sp.PD, FINASIM', '', '', '', 'Simposium', 1, 0, 0, 0, 'Panitia, Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P141', 141, 'dr. Ghea De Silva, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P142', 142, 'dr. Ma’mun, M.Sc, Sp,PD, Subsp.GEH.(K)', '', '', '', 'Simposium', 1, 0, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P143', 143, 'dr. Indra Setya Permana, Sp.PD, MMR, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P144', 144, 'dr. Febri Kurniawati, Sp.PD, K-EMD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Panitia, Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P145', 145, 'dr. Ika Trisnawati, Sp.PD, K-P, FINASIM', '', '', '', 'Simposium', 1, 0, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P146', 146, 'dr. Eko Budiono, Sp.PD, K-PMK, FINASIM', '', '', '', 'Simposium', 1, 0, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P147', 147, 'dr. Ni Ketut Donna Prisilia Tanjungsari, Sp.PD, MMR, M.Biomed', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P148', 148, 'dr. Suharno, Sp.PD, K-GEH, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P149', 149, 'dr. Kukuh Prasetyo, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P150', 150, 'dr. Aditiawarman, Sp.PD, K-GH, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P151', 151, 'dr. Aditya Candra Putra, Sp.PD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, 'Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P152', 152, 'dr. Maschun Syarifudin, Sp.PD, Subsp.HOM.(K), FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia, Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P153', 153, 'dr. Lincah Angger Wismo Asih, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P154', 154, 'dr. Joko Rilo Pambudi, Sp.PD, K-R, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P155', 155, 'Dr. dr. Arifin, Sp.PD, K-IC, FINASIM', '', '', '', 'Simposium', 1, 0, 0, 0, 'Pembicara', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P156', 156, 'dr. Maela Rustiana Dewi, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia, Moderator', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P157', 157, 'dr. Ryan Ma’rufi, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, 'Panitia', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 13:55:38'),
    ('P158', 158, 'dr. Danang Setyawan', '081317874150', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P159', 159, 'dr. Henny  Eka Setyawati', '081327354164', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P160', 160, 'Suryadi', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P161', 161, 'M. Aulady Rifki Kamal', '085156916548', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P162', 162, 'Dr. ANDIANTO , SpPD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P163', 163, 'Dr. ENDANG SRI UNTARI , SpPD, FINASIM', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P164', 164, 'dr. Gigih Fitriawan, SpPD', '081329421452', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P165', 165, 'Rahmawati', '085321591126', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P166', 166, 'dr. Anggita Budi Wahyono', '082131030341', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P167', 167, 'Yona Ajeng Triafatma', '08112812085', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P168', 168, 'Aditya Kristiaji', '081542277084', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P169', 169, 'Widi Palupi Ayu Padmandani', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P170', 170, 'Dr. WAHYU DJATMIKO , SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P171', 171, 'Dr. I GEDE ARINTON , SpPD', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P172', 172, 'dr. Yuniar Rachmad Wijayanto, Sp.An', '', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P173', 173, 'Ismuhartinah', '081327458607', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P174', 174, 'Grahita Anindita Poernomo', '081387582649', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P175', 175, 'dr. Anwar Hudiono, M. P. H.', '082220301930', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P176', 176, 'dr. Lily Kusumasita Burkon, M.K.K.', '08170615856', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P177', 177, 'Afra Bryges Tamia', '082225973246', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P178', 178, 'dr.Tantra Dewi Rahardyanti', '081215204691', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P179', 179, 'dr. Puspa ayu lestari', '081390901241', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P180', 180, 'Puspita Arum', '085229300023', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P181', 181, 'Muhammad Al Farizi Ganda Saputra', '082242297770', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P182', 182, 'Ali Said', '085803485114', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P183', 183, 'Fakikha Aditami', '081251510076', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P184', 184, 'dr. Ajeng Destian S,Mbiomed (AAAM)', '082243570471', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P185', 185, 'dr. Gerry Febrian Rizaldy, Sp.PD', '081239779800', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P186', 186, 'Dr. IMAM MUKTIADI , Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P187', 187, 'Nabila Putri Maharani', '082135113728', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P188', 188, 'Deby Wicaksono Septyandaru', '0895422917778', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P189', 189, 'Jihan Fatmawati', '085747706133', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P190', 190, 'Shanti Kirana', '085229697826', '', '', 'Simposium dan Workshop', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P191', 191, 'dr Dia Irawati, Sp.PD, M.Kes', '082328010440', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P192', 192, 'dr.Rundito,M.Biomed', '081804727239', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P193', 193, 'Satria Lutfi Hanata Samudra', '081392507794', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P194', 194, 'I Ngurah Ardhi Wiratama', '081325380014', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P195', 195, 'dr. Adelia Budhie Puspita Sari', '0811272232', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, 'voucher', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P196', 196, 'Devi Yuliana Suhardi', '085701415177', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P197', 197, 'Bella Septiani Br Turnip', '087892504447', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P198', 198, 'Mega Putri Kusuma Dewi', '081327058687', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P199', 199, 'Dionisius Halim Kusuma Wardhana', '08997906168', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P200', 200, 'Kartika Aridini', '0895377346495', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P201', 201, 'Sheila Fiona', '082138064866', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P202', 202, 'dr Novia Etty Parmawati SpPD FINASIM', '081228444699', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P203', 203, 'dr Herni Setiyowati', '081391025003', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P204', 204, 'dr.Lusi Yelena', '08164221356', '', '', 'simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P205', 205, 'dr Anjar Budi Astoro, SpPD,  FINASIM', '081328591175', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P206', 206, 'dr. Afan Deni Wikanta', '085327192446', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P207', 207, 'Amjad Hibatullah', '0895341303995', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P208', 208, 'Milla Bella Imbrany', '082114498034', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P209', 209, 'dr Iin Setiyana', '085973186704', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P210', 210, 'dr Irvan Dwi Cahyono', '085744190794', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P211', 211, 'dr Ratna Purnamawati', '08122835355', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P212', 212, 'dr. Yayan Goenawan', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P213', 213, 'Masrian Hendrianto', '082134649578', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P214', 214, 'Fikri Fachri Pradika Busono', '082138789787', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P215', 215, 'dr Nur Ariawanti Prasetyaningsih', '081548151160', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P216', 216, 'dr. Irwan Santoso Sp.PD', '081392949600', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P217', 217, 'dr. Samuel Christopel', '081295021735', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P218', 218, 'dr. Aulia Muhammad Fikri, Sp.PD', '082133550367', '', '', 'Simposium dan Workshop', 1, 0, 0, 1, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P219', 219, 'dr. Rangga Wisnu Wardhana, M.Biomed', '081217847042', '', '', 'simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P220', 220, 'Yusuf Indra Kusuma', '082262268687', '', '', 'simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P221', 221, 'dr. Muhammad Zuhdan Fannani, Sp.PD', '', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P222', 222, 'dr. Andini Laily Ramadhani', '081215976595', '', '', 'Simposium', 1, 0, 0, 0, 'voucher', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P223', 223, 'Zahrotunnisa Arizky', '081227267110', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P224', 224, 'dr Hafidz Setyawati Sp.PD', '082135575000', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P225', 225, 'Fauziah Rahma Istianingrum', '081226762660', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P226', 226, 'dr. Retno Pamungkas Sari', '08164282521', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P227', 227, 'Ilham Paramasatya', '081331077898', '', '', 'Workshop', 0, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P228', 228, 'Yova linda', '08121572314', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P229', 229, 'Luh ayu made anika kemala sari', '089508814353', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P230', 230, 'dr. Muhammad Zulfikar Rizki A', '081393631629', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P231', 231, 'dr Ratna Bangun Wibawa SpKFR', '082225288800', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P232', 232, 'dr. Prahesti Fajarwati, MPH', '08882749527', '', '', 'simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P233', 233, 'Syarah Mutia Dewi', '085848569414', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P234', 234, 'Fadila Rahmah', '085710875381', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P235', 235, 'dr. Fatma Nashriati', '085707425682', '', '', 'Simposium dan Workshop', 1, 0, 1, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P236', 236, 'Nadia Monita', '''081364272972', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P237', 237, 'Nurul Fadilah', '', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P238', 238, 'dr. Tuti Hadiyanti', '085640005196', '', '', 'Workshop', 0, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P239', 239, 'Nanik Harjanti', '082221241454', '', '', 'Simposium dan Workshop', 1, 1, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P240', 240, 'Stella Pangestika', '082266019820', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P241', 241, 'Ani Setiyowati', '082137379634', '', '', 'Simposium', 1, 0, 0, 0, '', 'IMPORT', '2026-10-16 11:35:39', '2026-10-16 11:35:39'),
    ('P242', 242, 'Edy Raras Reswati', '', 'Panitia PIT VIII PAPDI Purwokerto', '', 'Simposium', 1, 0, 0, 0, 'Panitia', 'MANUAL', '2026-10-16 13:47:31', '2026-10-16 13:55:38'),
    ('P243', 243, 'Edy Nurul Yuniarti', '', 'Panitia PIT VIII PAPDI Purwokerto', '', 'Simposium', 1, 0, 0, 0, 'Panitia', 'MANUAL', '2026-10-16 13:47:31', '2026-10-16 13:55:38')
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

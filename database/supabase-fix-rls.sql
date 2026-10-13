-- ========================================================
-- FIX ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- Izinkan hak akses penuh (SELECT, INSERT, UPDATE, DELETE)
-- untuk role 'anon' dan 'authenticated'
-- ========================================================

-- 1. Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access events" ON events;
CREATE POLICY "Public full access events" ON events 
    FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- 2. Panitia
ALTER TABLE panitia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access panitia" ON panitia;
CREATE POLICY "Public full access panitia" ON panitia 
    FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- 3. Workshops
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access workshops" ON workshops;
CREATE POLICY "Public full access workshops" ON workshops 
    FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- 4. Participants
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access participants" ON participants;
CREATE POLICY "Public full access participants" ON participants 
    FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- 5. Attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access attendance" ON attendance;
CREATE POLICY "Public full access attendance" ON attendance 
    FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- 6. Workshop Attendance
ALTER TABLE workshop_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access workshop_attendance" ON workshop_attendance;
CREATE POLICY "Public full access workshop_attendance" ON workshop_attendance 
    FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- 7. Logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access logs" ON logs;
CREATE POLICY "Public full access logs" ON logs 
    FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- Grant privileges
GRANT ALL ON TABLE events TO anon, authenticated, service_role;
GRANT ALL ON TABLE panitia TO anon, authenticated, service_role;
GRANT ALL ON TABLE workshops TO anon, authenticated, service_role;
GRANT ALL ON TABLE participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE workshop_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE logs TO anon, authenticated, service_role;

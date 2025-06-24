-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main table using JSONB for flexibility
CREATE TABLE scan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(2048) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    scan_data JSONB DEFAULT '{}',
    report_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '3 hours'
);

-- Email collection (optional feature)
CREATE TABLE email_list (
    email VARCHAR(255) PRIMARY KEY,
    website_url VARCHAR(2048),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sessions_status ON scan_sessions(status);
CREATE INDEX idx_sessions_expires ON scan_sessions(expires_at);
CREATE INDEX idx_sessions_created ON scan_sessions(created_at);

-- Auto-cleanup function to remove expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() 
RETURNS void AS $$
BEGIN
    DELETE FROM scan_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_list ENABLE ROW LEVEL SECURITY;

-- Policies for scan_sessions (allow all operations for now, can be restricted later)
CREATE POLICY "Allow all operations on scan_sessions" ON scan_sessions
    FOR ALL USING (true);

-- Policies for email_list (allow all operations for now, can be restricted later)
CREATE POLICY "Allow all operations on email_list" ON email_list
    FOR ALL USING (true);

-- Schedule cleanup every hour using pg_cron (if available)
-- Note: This requires pg_cron extension which may not be available on all Supabase instances
-- If not available, you can run cleanup manually or via a scheduled function
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');

-- Alternative: Create a database function that can be called via API
CREATE OR REPLACE FUNCTION public.cleanup_and_count()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
    deleted_count bigint;
BEGIN
    DELETE FROM scan_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON scan_sessions TO anon, authenticated;
GRANT ALL ON email_list TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_and_count() TO anon, authenticated;
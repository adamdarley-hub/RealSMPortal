-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create API configurations table for storing service configurations
CREATE TABLE api_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT UNIQUE NOT NULL CHECK (service_name IN ('servemanager', 'stripe', 'radar')),
  base_url TEXT,
  api_key TEXT,
  publishable_key TEXT,
  secret_key TEXT,
  webhook_secret TEXT,
  environment TEXT CHECK (environment IN ('test', 'live')),
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servemanager_id BIGINT UNIQUE NOT NULL,
  job_number TEXT NOT NULL,
  client_company TEXT,
  client_name TEXT,
  recipient_name TEXT,
  service_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  service_status TEXT,
  priority TEXT DEFAULT 'routine',
  server_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  amount DECIMAL(10,2),
  raw_data JSONB,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'error')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servemanager_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create servers table
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servemanager_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attempts table
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  servemanager_attempt_id BIGINT NOT NULL,
  status TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL,
  server_name TEXT,
  method TEXT CHECK (method IN ('mobile', 'manual')),
  success BOOLEAN DEFAULT FALSE,
  serve_type TEXT,
  recipient TEXT,
  address TEXT,
  description TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  gps_accuracy DECIMAL(8,2),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, servemanager_attempt_id)
);

-- Create photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
  servemanager_photo_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT,
  size BIGINT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, servemanager_photo_id)
);

-- Create indexes for performance
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_priority ON jobs(priority);
CREATE INDEX idx_jobs_client_company ON jobs(client_company);
CREATE INDEX idx_jobs_server_name ON jobs(server_name);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_updated_at ON jobs(updated_at DESC);
CREATE INDEX idx_jobs_servemanager_id ON jobs(servemanager_id);
CREATE INDEX idx_jobs_sync_status ON jobs(sync_status);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_company ON clients(company);
CREATE INDEX idx_clients_servemanager_id ON clients(servemanager_id);

CREATE INDEX idx_servers_name ON servers(name);
CREATE INDEX idx_servers_servemanager_id ON servers(servemanager_id);

CREATE INDEX idx_attempts_job_id ON attempts(job_id);
CREATE INDEX idx_attempts_attempted_at ON attempts(attempted_at DESC);
CREATE INDEX idx_attempts_success ON attempts(success);
CREATE INDEX idx_attempts_servemanager_id ON attempts(servemanager_attempt_id);

CREATE INDEX idx_photos_attempt_id ON photos(attempt_id);
CREATE INDEX idx_photos_servemanager_id ON photos(servemanager_photo_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attempts_updated_at BEFORE UPDATE ON attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - can be restricted later)
CREATE POLICY "Enable all operations for jobs" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for servers" ON servers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for attempts" ON attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for photos" ON photos FOR ALL USING (true) WITH CHECK (true);

-- Create function for getting job with full details
CREATE OR REPLACE FUNCTION get_job_with_details(job_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'job', jobs.*,
        'attempts', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'attempt', attempts.*,
                    'photos', (
                        SELECT COALESCE(json_agg(photos.*), '[]'::json)
                        FROM photos
                        WHERE photos.attempt_id = attempts.id
                    )
                )
            ), '[]'::json)
            FROM attempts
            WHERE attempts.job_id = jobs.id
            ORDER BY attempts.attempted_at DESC
        )
    )
    INTO result
    FROM jobs
    WHERE jobs.id = job_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function for fast job list with pagination
CREATE OR REPLACE FUNCTION get_jobs_paginated(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_status TEXT[] DEFAULT NULL,
    p_priority TEXT[] DEFAULT NULL,
    p_client TEXT[] DEFAULT NULL,
    p_server TEXT[] DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'DESC'
)
RETURNS TABLE(
    total_count BIGINT,
    jobs JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_jobs AS (
        SELECT j.*
        FROM jobs j
        WHERE (p_status IS NULL OR j.status = ANY(p_status))
          AND (p_priority IS NULL OR j.priority = ANY(p_priority))
          AND (p_client IS NULL OR j.client_company = ANY(p_client))
          AND (p_server IS NULL OR j.server_name = ANY(p_server))
          AND (p_search IS NULL OR (
            j.job_number ILIKE '%' || p_search || '%' OR
            j.client_company ILIKE '%' || p_search || '%' OR
            j.recipient_name ILIKE '%' || p_search || '%' OR
            j.service_address ILIKE '%' || p_search || '%'
          ))
    ),
    total AS (
        SELECT COUNT(*) as count FROM filtered_jobs
    ),
    paginated AS (
        SELECT * FROM filtered_jobs
        ORDER BY 
            CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'DESC' THEN created_at END DESC,
            CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'ASC' THEN created_at END ASC,
            CASE WHEN p_sort_by = 'status' AND p_sort_order = 'DESC' THEN status END DESC,
            CASE WHEN p_sort_by = 'status' AND p_sort_order = 'ASC' THEN status END ASC,
            CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'DESC' THEN priority END DESC,
            CASE WHEN p_sort_by = 'priority' AND p_sort_order = 'ASC' THEN priority END ASC,
            CASE WHEN p_sort_by = 'client_company' AND p_sort_order = 'DESC' THEN client_company END DESC,
            CASE WHEN p_sort_by = 'client_company' AND p_sort_order = 'ASC' THEN client_company END ASC,
            created_at DESC -- fallback
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        total.count,
        json_agg(paginated.* ORDER BY paginated.created_at DESC)
    FROM total, paginated
    GROUP BY total.count;
END;
$$ LANGUAGE plpgsql;

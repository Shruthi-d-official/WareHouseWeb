/*
  # Updated Warehouse Management Schema

  1. Tables
    - `users` - All system users with role-based hierarchy
    - `bin_master` - Bin information with quantities as per books
    - `counting_sessions` - Worker counting sessions with start/end times
    - `counting_data` - Detailed counting records
    - `worker_performance` - Performance metrics and rankings
    - `otp_requests` - OTP verification for worker logins
    - `audit_logs` - System audit trail

  2. Security
    - Enable RLS on all tables
    - Role-based access policies
    - Data isolation between vendors
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS worker_performance CASCADE;
DROP TABLE IF EXISTS counting_data CASCADE;
DROP TABLE IF EXISTS counting_sessions CASCADE;
DROP TABLE IF EXISTS otp_requests CASCADE;
DROP TABLE IF EXISTS bin_master CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table with role hierarchy
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'vendor', 'team_leader', 'worker')),
  password_hash text NOT NULL,
  email text,
  warehouse_name text,
  vendor_id uuid REFERENCES users(id),
  team_leader_id uuid REFERENCES users(id),
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bin Master table
CREATE TABLE bin_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_no text NOT NULL,
  warehouse_name text NOT NULL,
  qty_as_per_books integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bin_no, warehouse_name)
);

-- Counting Sessions table
CREATE TABLE counting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES users(id),
  team_leader_id uuid NOT NULL REFERENCES users(id),
  warehouse_name text NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Counting Data table (main data recording)
CREATE TABLE counting_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES counting_sessions(id),
  wh_name text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  tl_name text NOT NULL,
  username text NOT NULL,
  bin_no text NOT NULL,
  qty_counted integer NOT NULL,
  qty_recounted_tl integer,
  qty_as_per_books integer NOT NULL,
  difference integer GENERATED ALWAYS AS (
    COALESCE(qty_recounted_tl, qty_counted) - qty_as_per_books
  ) STORED,
  reason_for_difference text,
  created_at timestamptz DEFAULT now()
);

-- Worker Performance table
CREATE TABLE worker_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wh_name text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  username text NOT NULL,
  no_of_bins_counted integer DEFAULT 0,
  no_of_qty_counted integer DEFAULT 0,
  time_taken_minutes integer DEFAULT 0,
  efficiency decimal(5,2) DEFAULT 0,
  ranking integer,
  created_at timestamptz DEFAULT now()
);

-- OTP Requests table
CREATE TABLE otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES users(id),
  team_leader_id uuid NOT NULL REFERENCES users(id),
  otp_code text NOT NULL,
  is_approved boolean DEFAULT false,
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  details text NOT NULL,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bin_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE counting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE counting_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Admin can see all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Vendors can see their hierarchy" ON users
  FOR ALL TO authenticated
  USING (
    auth.uid() = id OR
    vendor_id = auth.uid() OR
    team_leader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for bin_master
CREATE POLICY "Users can read bin master" ON bin_master
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can manage bin master" ON bin_master
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for counting_sessions
CREATE POLICY "Users can access their sessions" ON counting_sessions
  FOR ALL TO authenticated
  USING (
    worker_id = auth.uid() OR
    team_leader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'vendor')
    )
  );

-- RLS Policies for counting_data
CREATE POLICY "Users can access their counting data" ON counting_data
  FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT id FROM counting_sessions 
      WHERE worker_id = auth.uid() OR team_leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'vendor')
    )
  );

-- RLS Policies for worker_performance
CREATE POLICY "Users can access performance data" ON worker_performance
  FOR ALL TO authenticated
  USING (
    username IN (
      SELECT user_id FROM users 
      WHERE id = auth.uid() OR team_leader_id = auth.uid() OR vendor_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS Policies for otp_requests
CREATE POLICY "Team leaders and workers can access OTP requests" ON otp_requests
  FOR ALL TO authenticated
  USING (
    worker_id = auth.uid() OR
    team_leader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'vendor')
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admin can see all audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users can create audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert default admin user
INSERT INTO users (user_id, role, password_hash, is_approved) 
VALUES ('admin', 'admin', '$2b$10$example_hash_replace_with_real', true);

-- Insert sample bin master data
INSERT INTO bin_master (bin_no, warehouse_name, qty_as_per_books) VALUES
('BIN001', 'Warehouse A', 100),
('BIN002', 'Warehouse A', 150),
('BIN003', 'Warehouse A', 200),
('BIN004', 'Warehouse B', 75),
('BIN005', 'Warehouse B', 125);

-- Create indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_vendor_id ON users(vendor_id);
CREATE INDEX idx_users_team_leader_id ON users(team_leader_id);
CREATE INDEX idx_counting_data_session_id ON counting_data(session_id);
CREATE INDEX idx_counting_data_date ON counting_data(date);
CREATE INDEX idx_worker_performance_date ON worker_performance(date);
CREATE INDEX idx_bin_master_warehouse ON bin_master(warehouse_name);
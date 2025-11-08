-- WorkZen HRMS Database Schema
-- This script creates the complete database structure for the HRMS system
-- Run this first to initialize the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables if they exist (for fresh start)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payroll_approvals CASCADE;
DROP TABLE IF EXISTS payroll_entries CASCADE;
DROP TABLE IF EXISTS payruns CASCADE;
DROP TABLE IF EXISTS leave_approvals CASCADE;
DROP TABLE IF EXISTS time_off_requests CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS leave_allocations CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ============================================
-- DEPARTMENTS TABLE
-- ============================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT department_name_not_empty CHECK (length(trim(name)) > 0)
);

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  department_id UUID NOT NULL,
  position VARCHAR(100) NOT NULL,
  employment_type VARCHAR(20) DEFAULT 'Full-time', -- Full-time, Part-time, Contract
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, on-leave, suspended
  date_of_joining DATE NOT NULL,
  date_of_birth DATE,
  salary DECIMAL(12, 2),
  bank_account VARCHAR(50),
  pan_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_email_not_empty CHECK (length(trim(email)) > 0),
  CONSTRAINT employee_salary_positive CHECK (salary > 0 OR salary IS NULL),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);

-- ============================================
-- USERS TABLE (Authentication & Authorization)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL, -- employee, hr_officer, payroll_officer, admin
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
  last_login TIMESTAMP,
  last_login_ip VARCHAR(45),
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_email_not_empty CHECK (length(trim(email)) > 0),
  CONSTRAINT valid_role CHECK (role IN ('employee', 'hr_officer', 'payroll_officer', 'admin')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- ============================================
-- ATTENDANCE RECORDS TABLE
-- ============================================
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL,
  check_in_time TIMESTAMP NOT NULL,
  check_out_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'present', -- present, absent, half-day, late, early-leave
  hours_worked DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hours_worked_positive CHECK (hours_worked >= 0 OR hours_worked IS NULL),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ============================================
-- LEAVE ALLOCATIONS TABLE
-- ============================================
CREATE TABLE leave_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL,
  fiscal_year INT NOT NULL,
  vacation_days INT DEFAULT 20,
  sick_days INT DEFAULT 10,
  personal_days INT DEFAULT 3,
  unpaid_days INT DEFAULT 0,
  vacation_used INT DEFAULT 0,
  sick_used INT DEFAULT 0,
  personal_used INT DEFAULT 0,
  unpaid_used INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT days_not_negative CHECK (vacation_days >= 0 AND sick_days >= 0 AND personal_days >= 0 AND unpaid_days >= 0),
  CONSTRAINT used_not_negative CHECK (vacation_used >= 0 AND sick_used >= 0 AND personal_used >= 0 AND unpaid_used >= 0),
  UNIQUE(employee_id, fiscal_year),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ============================================
-- TIME OFF REQUESTS TABLE
-- ============================================
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL,
  request_type VARCHAR(20) NOT NULL, -- vacation, sick, personal, unpaid
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  days_requested INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  approval_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date),
  CONSTRAINT days_requested_positive CHECK (days_requested > 0),
  CONSTRAINT valid_request_type CHECK (request_type IN ('vacation', 'sick', 'personal', 'unpaid')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- LEAVE APPROVALS TABLE (Workflow Tracking)
-- ============================================
CREATE TABLE leave_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_off_request_id UUID NOT NULL,
  approver_id UUID NOT NULL,
  approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  comments TEXT,
  approval_order INT DEFAULT 1, -- 1 = HR Officer, 2 = Admin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  UNIQUE(time_off_request_id, approver_id),
  FOREIGN KEY (time_off_request_id) REFERENCES time_off_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================
-- PAYRUNS TABLE
-- ============================================
CREATE TABLE payruns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payrun_month INT NOT NULL, -- 1-12
  payrun_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, approved, processed, completed
  total_employees INT DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  submitted_by UUID,
  submitted_at TIMESTAMP,
  approved_by UUID,
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'approved', 'processed', 'completed')),
  CONSTRAINT total_amount_positive CHECK (total_amount >= 0),
  UNIQUE(payrun_month, payrun_year),
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- PAYROLL ENTRIES TABLE
-- ============================================
CREATE TABLE payroll_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payrun_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  gross_salary DECIMAL(12, 2) NOT NULL,
  basic_pay DECIMAL(12, 2),
  dearness_allowance DECIMAL(12, 2) DEFAULT 0,
  house_rent_allowance DECIMAL(12, 2) DEFAULT 0,
  travel_allowance DECIMAL(12, 2) DEFAULT 0,
  other_allowances DECIMAL(12, 2) DEFAULT 0,
  total_earnings DECIMAL(12, 2),
  provident_fund DECIMAL(12, 2) DEFAULT 0,
  income_tax DECIMAL(12, 2) DEFAULT 0,
  professional_tax DECIMAL(12, 2) DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2),
  net_salary DECIMAL(12, 2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, processed, paid, failed
  payment_date DATE,
  payment_method VARCHAR(20), -- bank_transfer, check, cash
  bank_reference VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT amounts_positive CHECK (
    gross_salary > 0 AND 
    total_earnings > 0 AND 
    total_deductions >= 0 AND 
    net_salary >= 0
  ),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'processed', 'paid', 'failed')),
  UNIQUE(payrun_id, employee_id),
  FOREIGN KEY (payrun_id) REFERENCES payruns(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
);

-- ============================================
-- PAYROLL APPROVALS TABLE (Multi-level Approval)
-- ============================================
CREATE TABLE payroll_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payrun_id UUID NOT NULL,
  approver_id UUID NOT NULL,
  approval_level INT DEFAULT 1, -- 1 = Payroll Officer, 2 = Finance, 3 = Admin
  approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  comments TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT valid_approval_level CHECK (approval_level IN (1, 2, 3)),
  UNIQUE(payrun_id, approver_id),
  FOREIGN KEY (payrun_id) REFERENCES payruns(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  data_type VARCHAR(20), -- string, number, boolean, json
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(50) NOT NULL, -- login, create, update, delete, approve, reject
  resource_type VARCHAR(50), -- employee, payroll, leave, etc.
  resource_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'success', -- success, failure
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(check_in_time);
CREATE INDEX idx_leave_allocations_employee ON leave_allocations(employee_id);
CREATE INDEX idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX idx_time_off_requests_dates ON time_off_requests(start_date, end_date);
CREATE INDEX idx_payruns_status ON payruns(status);
CREATE INDEX idx_payruns_date ON payruns(payrun_year, payrun_month);
CREATE INDEX idx_payroll_entries_payrun ON payroll_entries(payrun_id);
CREATE INDEX idx_payroll_entries_employee ON payroll_entries(employee_id);
CREATE INDEX idx_payroll_entries_status ON payroll_entries(payment_status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Current year leave balances
CREATE OR REPLACE VIEW v_current_leave_balances AS
SELECT 
  e.id,
  e.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  la.fiscal_year,
  la.vacation_days - COALESCE(la.vacation_used, 0) as vacation_balance,
  la.sick_days - COALESCE(la.sick_used, 0) as sick_balance,
  la.personal_days - COALESCE(la.personal_used, 0) as personal_balance,
  la.vacation_used,
  la.sick_used,
  la.personal_used
FROM employees e
LEFT JOIN leave_allocations la ON e.id = la.employee_id 
  AND la.fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Employee payroll summary
CREATE OR REPLACE VIEW v_employee_payroll_summary AS
SELECT 
  e.id,
  e.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  COUNT(pe.id) as payrolls_count,
  SUM(pe.gross_salary) as total_earnings,
  SUM(pe.total_deductions) as total_deductions,
  SUM(pe.net_salary) as total_paid,
  MAX(pr.payrun_month) as last_payroll_month,
  MAX(pr.payrun_year) as last_payroll_year
FROM employees e
LEFT JOIN payroll_entries pe ON e.id = pe.employee_id
LEFT JOIN payruns pr ON pe.payrun_id = pr.id
GROUP BY e.id, e.employee_id, e.first_name, e.last_name;

-- System health metrics
CREATE OR REPLACE VIEW v_system_health AS
SELECT 
  'Total Users'::TEXT as metric,
  COUNT(*)::TEXT as value
FROM users
UNION ALL
SELECT 
  'Active Users'::TEXT,
  COUNT(*)::TEXT
FROM users WHERE status = 'active'
UNION ALL
SELECT 
  'Total Employees'::TEXT,
  COUNT(*)::TEXT
FROM employees
UNION ALL
SELECT 
  'Pending Time Off Requests'::TEXT,
  COUNT(*)::TEXT
FROM time_off_requests WHERE status = 'pending'
UNION ALL
SELECT 
  'Pending Payruns'::TEXT,
  COUNT(*)::TEXT
FROM payruns WHERE status IN ('draft', 'submitted');

-- ============================================
-- DEFAULT SYSTEM SETTINGS
-- ============================================
INSERT INTO system_settings (setting_key, setting_value, data_type, description) VALUES
  ('company_name', 'WorkZen Corporation', 'string', 'Official company name'),
  ('timezone', 'UTC', 'string', 'System timezone'),
  ('fiscal_year_start', 'January', 'string', 'Fiscal year start month'),
  ('leave_year_reset_date', '01-01', 'string', 'Leave allocation reset date'),
  ('max_login_attempts', '5', 'number', 'Maximum failed login attempts before lockout'),
  ('session_timeout_minutes', '30', 'number', 'Session timeout duration in minutes'),
  ('require_2fa', 'false', 'boolean', 'Require two-factor authentication'),
  ('backup_frequency', 'daily', 'string', 'Backup frequency'),
  ('enable_audit_logging', 'true', 'boolean', 'Enable detailed audit logging')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- CONFIRMATION MESSAGE
-- ============================================
-- To verify the schema was created successfully, run:
-- \dt -- shows all tables
-- \dv -- shows all views
-- SELECT * FROM information_schema.tables WHERE table_schema = 'public';

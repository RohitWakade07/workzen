-- WorkZen HRMS Sample Data
-- This script populates the database with sample data for testing

-- ============================================
-- SEED DEPARTMENTS
-- ============================================
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software and hardware development team'),
  ('Human Resources', 'HR and employee management'),
  ('Payroll', 'Payroll processing and accounting'),
  ('Sales', 'Sales and business development'),
  ('Marketing', 'Marketing and brand management');

-- ============================================
-- SEED EMPLOYEES
-- ============================================
INSERT INTO employees (
  employee_id, first_name, last_name, email, phone, 
  department_id, position, employment_type, status, 
  date_of_joining, date_of_birth, salary
) VALUES
  (
    'EMP001', 'John', 'Doe', 'john.doe@company.com', '555-0101',
    (SELECT id FROM departments WHERE name = 'Engineering'),
    'Senior Developer', 'Full-time', 'active',
    '2020-03-15', '1990-05-20', 85000
  ),
  (
    'EMP002', 'Jane', 'Smith', 'jane.smith@company.com', '555-0102',
    (SELECT id FROM departments WHERE name = 'Human Resources'),
    'HR Manager', 'Full-time', 'active',
    '2021-06-20', '1988-08-15', 75000
  ),
  (
    'EMP003', 'Bob', 'Wilson', 'bob.wilson@company.com', '555-0103',
    (SELECT id FROM departments WHERE name = 'Payroll'),
    'Payroll Officer', 'Full-time', 'active',
    '2019-01-10', '1985-12-10', 65000
  ),
  (
    'EMP004', 'Alice', 'Johnson', 'alice.johnson@company.com', '555-0104',
    (SELECT id FROM departments WHERE name = 'Sales'),
    'Sales Manager', 'Full-time', 'active',
    '2018-09-05', '1987-03-22', 70000
  ),
  (
    'EMP005', 'Charlie', 'Brown', 'charlie.brown@company.com', '555-0105',
    (SELECT id FROM departments WHERE name = 'Marketing'),
    'Marketing Specialist', 'Full-time', 'on-leave',
    '2022-02-14', '1995-07-30', 55000
  );

-- ============================================
-- SEED USERS (Authentication)
-- ============================================
-- Note: Passwords are hashed. In production, use proper password hashing
INSERT INTO users (email, password_hash, role, status, employee_id) VALUES
  (
    'john.doe@company.com',
    '$2b$12$abcdefghijklmnopqrstuvwxyz', -- hashed 'password'
    'employee',
    'active',
    (SELECT id FROM employees WHERE employee_id = 'EMP001')
  ),
  (
    'jane.smith@company.com',
    '$2b$12$abcdefghijklmnopqrstuvwxyz',
    'hr_officer',
    'active',
    (SELECT id FROM employees WHERE employee_id = 'EMP002')
  ),
  (
    'bob.wilson@company.com',
    '$2b$12$abcdefghijklmnopqrstuvwxyz',
    'payroll_officer',
    'active',
    (SELECT id FROM employees WHERE employee_id = 'EMP003')
  ),
  (
    'admin@company.com',
    '$2b$12$abcdefghijklmnopqrstuvwxyz',
    'admin',
    'active',
    NULL
  );

-- ============================================
-- SEED LEAVE ALLOCATIONS
-- ============================================
INSERT INTO leave_allocations (employee_id, fiscal_year, vacation_days, sick_days, personal_days) VALUES
  ((SELECT id FROM employees WHERE employee_id = 'EMP001'), 2025, 20, 10, 3),
  ((SELECT id FROM employees WHERE employee_id = 'EMP002'), 2025, 20, 10, 3),
  ((SELECT id FROM employees WHERE employee_id = 'EMP003'), 2025, 20, 10, 3),
  ((SELECT id FROM employees WHERE employee_id = 'EMP004'), 2025, 20, 10, 3),
  ((SELECT id FROM employees WHERE employee_id = 'EMP005'), 2025, 20, 10, 3);

-- ============================================
-- SEED ATTENDANCE RECORDS
-- ============================================
INSERT INTO attendance_records (employee_id, check_in_time, check_out_time, status, hours_worked) VALUES
  (
    (SELECT id FROM employees WHERE employee_id = 'EMP001'),
    '2025-11-08 09:00:00',
    '2025-11-08 17:30:00',
    'present',
    8.5
  ),
  (
    (SELECT id FROM employees WHERE employee_id = 'EMP002'),
    '2025-11-08 09:15:00',
    '2025-11-08 17:45:00',
    'present',
    8.5
  ),
  (
    (SELECT id FROM employees WHERE employee_id = 'EMP003'),
    '2025-11-08 08:55:00',
    '2025-11-08 17:30:00',
    'present',
    8.5
  );

-- ============================================
-- SEED TIME OFF REQUESTS
-- ============================================
INSERT INTO time_off_requests (
  employee_id, request_type, start_date, end_date, 
  reason, days_requested, status, approved_by, approved_at
) VALUES
  (
    (SELECT id FROM employees WHERE employee_id = 'EMP001'),
    'vacation',
    '2025-11-15',
    '2025-11-19',
    'Family vacation',
    5,
    'approved',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    '2025-11-05 14:00:00'
  ),
  (
    (SELECT id FROM employees WHERE employee_id = 'EMP002'),
    'sick',
    '2025-11-10',
    '2025-11-10',
    'Medical appointment',
    1,
    'approved',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    '2025-11-08 10:00:00'
  );

-- ============================================
-- SEED PAYRUNS
-- ============================================
INSERT INTO payruns (payrun_month, payrun_year, start_date, end_date, status, submitted_by, submitted_at, approved_by, approved_at) VALUES
  (
    11, 2025,
    '2025-11-01', '2025-11-30',
    'submitted',
    (SELECT id FROM users WHERE role = 'payroll_officer' LIMIT 1),
    '2025-11-05 10:00:00',
    NULL, NULL
  ),
  (
    10, 2025,
    '2025-10-01', '2025-10-31',
    'completed',
    (SELECT id FROM users WHERE role = 'payroll_officer' LIMIT 1),
    '2025-10-05 10:00:00',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    '2025-10-07 14:00:00'
  );

-- ============================================
-- SEED PAYROLL ENTRIES
-- ============================================
INSERT INTO payroll_entries (
  payrun_id, employee_id,
  gross_salary, basic_pay, dearness_allowance, house_rent_allowance,
  total_earnings, provident_fund, income_tax, total_deductions,
  net_salary, payment_status
) VALUES
  (
    (SELECT id FROM payruns WHERE payrun_month = 11 AND payrun_year = 2025 LIMIT 1),
    (SELECT id FROM employees WHERE employee_id = 'EMP001'),
    7083.33, 5000, 1200, 883.33,
    7083.33, 500, 600, 1100,
    5983.33, 'pending'
  ),
  (
    (SELECT id FROM payruns WHERE payrun_month = 11 AND payrun_year = 2025 LIMIT 1),
    (SELECT id FROM employees WHERE employee_id = 'EMP002'),
    6250, 4500, 1000, 750,
    6250, 450, 500, 950,
    5300, 'pending'
  );

-- ============================================
-- CONFIRMATION MESSAGE
-- ============================================
-- To verify the sample data was created successfully, run:
-- SELECT COUNT(*) as departments FROM departments;
-- SELECT COUNT(*) as employees FROM employees;
-- SELECT COUNT(*) as users FROM users;
-- SELECT * FROM v_current_leave_balances;
-- SELECT * FROM v_system_health;

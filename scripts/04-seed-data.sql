-- Seed departments
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software development and technical team'),
  ('Human Resources', 'HR and recruitment team'),
  ('Finance', 'Financial management and accounting'),
  ('Operations', 'Operational management')
ON CONFLICT DO NOTHING;

-- Seed leave types
INSERT INTO leave_types (name, description, default_allocation_days) VALUES
  ('Annual Leave', 'Paid annual vacation', 20),
  ('Sick Leave', 'Paid sick leave', 10),
  ('Casual Leave', 'Casual paid leave', 5),
  ('Unpaid Leave', 'Unpaid personal leave', 0),
  ('Maternity Leave', 'Paid maternity leave', 180),
  ('Paternity Leave', 'Paid paternity leave', 15)
ON CONFLICT DO NOTHING;

-- Seed deductions
INSERT INTO deductions (name, description) VALUES
  ('Income Tax', 'Income tax deduction'),
  ('Provident Fund', 'Employee provident fund contribution'),
  ('Insurance', 'Health and life insurance'),
  ('Professional Tax', 'Professional tax deduction')
ON CONFLICT DO NOTHING;

-- Seed sample holidays
INSERT INTO holidays (name, date, description, is_optional) VALUES
  ('New Year', '2024-01-01', 'New Year Day', false),
  ('Independence Day', '2024-08-15', 'Independence Day', false),
  ('Diwali', '2024-11-01', 'Festival of Lights', true)
ON CONFLICT DO NOTHING;

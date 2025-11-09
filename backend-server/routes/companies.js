/**
 * Companies Routes
 * Manages company registration and settings
 * Only accessible by admins for company management
 */

import express from 'express';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { extractCompanyId, requireSuperAdmin, validateEmployeeLimit } from '../middleware/company-isolation.js';

const router = express.Router();

// Middleware to extract company context
const authenticateToken = (req, res, next) => {
  // This should be imported from auth middleware
  // Placeholder for now
  next();
};

/**
 * @route   POST /api/companies/register
 * @desc    Register a new company with admin user
 * @access  Public (first-time registration)
 */
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      subscriptionPlan = 'basic'
    } = req.body;

    // Validation
    if (!companyName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      return res.status(400).json({ 
        error: 'Company name, admin details, email and password are required' 
      });
    }

    // Check if company already exists
    const companyCheck = await client.query(
      'SELECT id FROM companies WHERE name = $1',
      [companyName]
    );

    if (companyCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Company name already exists' });
    }

    // Check if admin email already exists
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Set employee limits based on plan
    const planLimits = {
      basic: 50,
      standard: 200,
      premium: 500,
      enterprise: 10000
    };

    // Create company
    const companyResult = await client.query(
      `INSERT INTO companies (name, email, phone_number, address, subscription_plan, max_employees)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, subscription_plan, max_employees`,
      [companyName, companyEmail, companyPhone, companyAddress, subscriptionPlan, planLimits[subscriptionPlan] || 50]
    );

    const company = companyResult.rows[0];

    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, company_id, is_active)
       VALUES ($1, $2, 'admin', $3, $4, $5, true)
       RETURNING id, email, role, first_name, last_name`,
      [adminEmail, hashedPassword, adminFirstName, adminLastName, company.id]
    );

    const admin = userResult.rows[0];

    // Create employee record for admin
    await client.query(
      `INSERT INTO employees (user_id, employee_id, designation, date_of_joining)
       VALUES ($1, $2, 'Administrator', CURRENT_DATE)`,
      [admin.id, `EMP-${Date.now()}`]
    );

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Company and admin account created successfully',
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        plan: company.subscription_plan,
        maxEmployees: company.max_employees
      },
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Company registration error:', error);
    res.status(500).json({ error: 'Failed to register company' });
  } finally {
    client.release();
  }
});

/**
 * @route   GET /api/companies/current
 * @desc    Get current user's company details
 * @access  Private
 */
router.get('/current', authenticateToken, extractCompanyId, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone_number, address, city, state, postal_code, country,
              subscription_status, subscription_plan, max_employees, is_active, created_at
       FROM companies
       WHERE id = $1`,
      [req.companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get employee count
    const countResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE u.company_id = $1`,
      [req.companyId]
    );

    const company = result.rows[0];
    company.employeeCount = parseInt(countResult.rows[0].count);
    company.employeesRemaining = company.max_employees - company.employeeCount;

    res.json(company);

  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

/**
 * @route   PUT /api/companies/current
 * @desc    Update current company details (admin only)
 * @access  Private (Admin)
 */
router.put('/current', authenticateToken, extractCompanyId, async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update company details' });
    }

    const {
      name,
      email,
      phone_number,
      address,
      city,
      state,
      postal_code,
      country
    } = req.body;

    const result = await pool.query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone_number = COALESCE($3, phone_number),
           address = COALESCE($4, address),
           city = COALESCE($5, city),
           state = COALESCE($6, state),
           postal_code = COALESCE($7, postal_code),
           country = COALESCE($8, country),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, email, phone_number, address, city, state, postal_code, country, req.companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({
      message: 'Company updated successfully',
      company: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

/**
 * @route   GET /api/companies/stats
 * @desc    Get company statistics
 * @access  Private (Admin/HR)
 */
router.get('/stats', authenticateToken, extractCompanyId, async (req, res) => {
  try {
    // Verify user has permission
    if (!['admin', 'hr_officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get various stats
    const stats = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE company_id = $1 AND is_active = true) as active_users,
        (SELECT COUNT(*) FROM employees e JOIN users u ON e.user_id = u.id WHERE u.company_id = $1) as total_employees,
        (SELECT COUNT(*) FROM departments WHERE company_id = $1) as total_departments,
        (SELECT COUNT(*) FROM time_off_requests tor 
         JOIN employees e ON tor.employee_id = e.id 
         JOIN users u ON e.user_id = u.id 
         WHERE u.company_id = $1 AND tor.status = 'pending') as pending_time_off_requests,
        (SELECT max_employees FROM companies WHERE id = $1) as max_employees`,
      [req.companyId]
    );

    res.json(stats.rows[0]);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch company statistics' });
  }
});

export default router;

/**
 * Company Isolation Middleware
 * Ensures multi-tenancy by automatically filtering queries by company_id
 * Prevents users from accessing data from other companies
 */

import pool from '../config/database.js';

/**
 * Extracts company_id from authenticated user
 * This middleware requires authenticateToken to run first
 */
const extractCompanyId = async (req, res, next) => {
  try {
    // User object set by authenticateToken middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's company_id from database
    const result = await pool.query(
      'SELECT company_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attach company_id to request object for use in routes
    req.companyId = result.rows[0].company_id;
    
    if (!req.companyId) {
      return res.status(403).json({ 
        error: 'User not associated with any company. Please contact administrator.' 
      });
    }

    next();
  } catch (error) {
    console.error('Error extracting company ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Validates that a resource belongs to the user's company
 * Use this before allowing access to specific resources
 */
const validateCompanyAccess = (tableName, resourceIdColumn = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.companyId) {
        return res.status(403).json({ error: 'Company context not set' });
      }

      const resourceId = req.params.id || req.params.employeeId;
      if (!resourceId) {
        return next(); // No specific resource to validate, continue
      }

      // Check if resource belongs to user's company
      const query = `
        SELECT company_id 
        FROM ${tableName} 
        WHERE ${resourceIdColumn} = $1
      `;
      
      const result = await pool.query(query, [resourceId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (result.rows[0].company_id !== req.companyId) {
        return res.status(403).json({ 
          error: 'Access denied. Resource belongs to different company.' 
        });
      }

      next();
    } catch (error) {
      console.error('Error validating company access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Helper function to add company_id filter to WHERE clause
 * Usage: const whereClause = buildCompanyFilter(req.companyId, 'status = $1');
 */
const buildCompanyFilter = (companyId, existingWhere = '') => {
  const companyFilter = `company_id = '${companyId}'`;
  
  if (!existingWhere || existingWhere.trim() === '') {
    return `WHERE ${companyFilter}`;
  }
  
  return `WHERE ${companyFilter} AND (${existingWhere})`;
};

/**
 * Admin-only company management
 * Allows admins to manage multiple companies (super admin scenario)
 */
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. This operation requires administrator privileges.' 
    });
  }
  next();
};

/**
 * Get company details for current user
 */
const getCompanyDetails = async (companyId) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone_number, subscription_status, 
              subscription_plan, max_employees, is_active
       FROM companies 
       WHERE id = $1`,
      [companyId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching company details:', error);
    return null;
  }
};

/**
 * Validate employee limit for company
 * Prevents adding more employees than subscription allows
 */
const validateEmployeeLimit = async (req, res, next) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ error: 'Company context not set' });
    }

    // Get company's max employee limit
    const companyResult = await pool.query(
      'SELECT max_employees FROM companies WHERE id = $1',
      [req.companyId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const maxEmployees = companyResult.rows[0].max_employees;

    // Count current employees
    const countResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE u.company_id = $1`,
      [req.companyId]
    );

    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= maxEmployees) {
      return res.status(403).json({ 
        error: `Employee limit reached. Your plan allows ${maxEmployees} employees.`,
        currentCount,
        maxEmployees
      });
    }

    // Attach counts to request for route to use if needed
    req.employeeCount = {
      current: currentCount,
      max: maxEmployees,
      remaining: maxEmployees - currentCount
    };

    next();
  } catch (error) {
    console.error('Error validating employee limit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  extractCompanyId,
  validateCompanyAccess,
  buildCompanyFilter,
  requireSuperAdmin,
  getCompanyDetails,
  validateEmployeeLimit
};

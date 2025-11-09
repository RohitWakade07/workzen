import express from "express"
import bcrypt from "bcryptjs"
import pool from "../config/database.js"
import { authenticateToken, requireHROrAdmin, canManageEmployee, filterEmployeesByRole } from "../middleware/auth.js"

const router = express.Router()
const PG_UNDEFINED_TABLE = "42P01"
const VALID_EMPLOYEE_STATUSES = new Set(["active", "inactive", "on-leave"])

/**
 * Generate employee login ID in format: [CompanyCode][FirstName2][LastName2][Year][SerialNumber]
 * Example: OIJODO20220001
 * - OI: First 2 letters of company name (e.g., "Odoo India")
 * - JO: First 2 letters of first name (e.g., "John")
 * - DO: First 2 letters of last name (e.g., "Doe")
 * - 2022: Year of joining
 * - 0001: Serial number for that year
 */
async function generateEmployeeId(companyId, firstName, lastName, yearOfJoining) {
  try {
    // Get company name
    const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId])
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found')
    }
    
    const companyName = companyResult.rows[0].name
    
    // Extract first 2 letters of company name (uppercase, remove spaces)
    const companyCode = companyName.replace(/\s+/g, '').substring(0, 2).toUpperCase()
    
    // Extract first 2 letters of first name and last name (uppercase)
    const firstNameCode = firstName.substring(0, 2).toUpperCase()
    const lastNameCode = lastName.substring(0, 2).toUpperCase()
    
    // Get year (default to current year if not provided)
    const year = yearOfJoining || new Date().getFullYear()
    
    // Get the next serial number for this year and company
    const serialResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE u.company_id = $1 
       AND EXTRACT(YEAR FROM e.date_of_joining) = $2`,
      [companyId, year]
    )
    
    const serialNumber = (parseInt(serialResult.rows[0].count) + 1).toString().padStart(4, '0')
    
    // Construct the employee ID
    const employeeId = `${companyCode}${firstNameCode}${lastNameCode}${year}${serialNumber}`
    
    console.log(`[v0] Generated employee ID: ${employeeId}`)
    return employeeId
    
  } catch (error) {
    console.error('[v0] Error generating employee ID:', error.message)
    // Fallback to timestamp-based ID if generation fails
    return `EMP-${Date.now()}-${Math.random().toString().slice(2, 6)}`
  }
}

// Middleware to extract company_id from authenticated user
async function extractCompanyId(req, res, next) {
  try {
    // Get company_id from authenticated user (set by authenticateToken middleware)
    let companyId = req.user?.companyId || req.query.company_id || req.body.company_id
    
    if (!companyId && req.user?.id) {
      // Try to get company_id from user's record
      const userResult = await pool.query(
        'SELECT company_id FROM users WHERE id = $1',
        [req.user.id]
      )
      if (userResult.rows.length > 0 && userResult.rows[0].company_id) {
        companyId = userResult.rows[0].company_id
        console.log(`[v0] Extracted company ID from user: ${companyId}`)
      }
    }
    
    if (!companyId) {
      // Get the first company as fallback (for development/testing)
      const result = await pool.query('SELECT id FROM companies LIMIT 1')
      if (result.rows.length === 0) {
        return res.status(400).json({ 
          detail: 'No company found. Please create a company first via signup.' 
        })
      }
      companyId = result.rows[0].id
      console.log(`[v0] Using default company ID: ${companyId}`)
    }
    
    req.companyId = companyId
    next()
  } catch (error) {
    console.error('[v0] Error extracting company ID:', error.message)
    res.status(500).json({ detail: 'Failed to determine company context' })
  }
}

async function ensureDepartment(department, companyId) {
  if (!department) {
    return null
  }

  if (!companyId) {
    throw new Error("Company ID is required to create or fetch departments")
  }

  const lookup = await pool.query(
    "SELECT id FROM departments WHERE LOWER(name) = LOWER($1) AND company_id = $2 LIMIT 1",
    [department, companyId]
  )
  
  if (lookup.rowCount > 0) {
    return lookup.rows[0].id
  }

  const created = await pool.query(
    "INSERT INTO departments (name, description, company_id) VALUES ($1, $2, $3) RETURNING id",
    [department, `${department} department`, companyId]
  )
  
  return created.rows[0].id
}

function mapEmployeeRow(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    employeeId: row.employee_id,
    name: `${row.first_name} ${row.last_name}`,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone_number,
    department_id: row.department_id,
    department: row.department_name ?? row.department ?? null,
    designation: row.designation,
    position: row.designation ?? row.position ?? null,
    employment_type: row.employment_type,
    status: row.status ?? "active",
    date_of_joining: row.date_of_joining,
    date_of_birth: row.date_of_birth,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function findEmployeeRowByIdentifier(identifier) {
  if (!identifier) {
    return null
  }

  const result = await pool.query(
    `
      SELECT e.*, u.email, u.first_name, u.last_name, u.role, d.name AS department_name
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.employee_id = $1 OR e.id::text = $1
      LIMIT 1
    `,
    [identifier]
  )

  return result.rowCount > 0 ? result.rows[0] : null
}

async function syncEmployeeUserAccount(employeeRow, email, employeeCode, statusValue) {
  const normalizedEmail = email.trim().toLowerCase()
  const accountStatus = statusValue === "inactive" ? "inactive" : "active"
  const passwordHash = bcrypt.hashSync(employeeCode, 10)

  try {
    const existing = await pool.query(
      `
        SELECT id, employee_id
        FROM users
        WHERE employee_id = $1 OR LOWER(email) = LOWER($2)
        LIMIT 1
      `,
      [employeeRow.id, normalizedEmail]
    )

    if (existing.rowCount > 0) {
      const existingRow = existing.rows[0]
      if (existingRow.employee_id && existingRow.employee_id !== employeeRow.id) {
        console.warn(
          `[v0] Employees: existing user with email ${normalizedEmail} is linked to a different employee. Skipping password sync.`
        )
        return
      }

      await pool.query(
        `
          UPDATE users
          SET email = $1,
              password_hash = $2,
              status = $3,
              updated_at = NOW()
          WHERE id = $4
        `,
        [normalizedEmail, passwordHash, accountStatus, existing.rows[0].id]
      )
    } else {
      await pool.query(
        `
          INSERT INTO users (employee_id, email, password_hash, role, status)
          VALUES ($1, $2, $3, 'employee', $4)
        `,
        [employeeRow.id, normalizedEmail, passwordHash, accountStatus]
      )
    }
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Employees: users table missing while syncing account")
      return
    }

    throw error
  }
}

async function ensureEmployeeProfilesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_profiles (
      employee_id VARCHAR(20) PRIMARY KEY,
      about TEXT,
      job_love TEXT,
      interests TEXT,
      skills JSONB DEFAULT '[]'::JSONB,
      certifications JSONB DEFAULT '[]'::JSONB,
      manager TEXT,
      location TEXT,
      gender TEXT,
      marital_status TEXT,
      nationality TEXT,
      company TEXT,
      mobile TEXT,
      date_of_birth DATE,
      date_of_joining DATE,
      residing_address TEXT,
      personal_email TEXT,
      account_number TEXT,
      bank_name TEXT,
      ifsc_code TEXT,
      pan_no TEXT,
      uan_no TEXT,
      emp_code TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  const additionalColumns = [
    ["company", "TEXT"],
    ["mobile", "TEXT"],
    ["date_of_birth", "DATE"],
    ["date_of_joining", "DATE"],
    ["residing_address", "TEXT"],
    ["personal_email", "TEXT"],
    ["account_number", "TEXT"],
    ["bank_name", "TEXT"],
    ["ifsc_code", "TEXT"],
    ["pan_no", "TEXT"],
    ["uan_no", "TEXT"],
    ["emp_code", "TEXT"],
  ]

  for (const [column, type] of additionalColumns) {
    await pool.query(`ALTER TABLE employee_profiles ADD COLUMN IF NOT EXISTS ${column} ${type}`)
  }
}

async function ensureEmployeeSalaryTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_salary (
      employee_id VARCHAR(20) PRIMARY KEY,
      month_wage NUMERIC,
      yearly_wage NUMERIC,
      working_days_per_week INT,
      break_time NUMERIC,
      pf_rate NUMERIC,
      professional_tax NUMERIC,
      salary_components JSONB DEFAULT '[]'::JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)
}

function safeParseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback
  }

  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value)
  } catch (error) {
    console.warn("[v0] Employees: Failed to parse JSON column", error)
    return fallback
  }
}

function toNullable(value) {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
  }

  return value
}

/**
 * ✅ GET /api/employees/
 * Fetch all employees
 */
router.get("/", authenticateToken, requireHROrAdmin, filterEmployeesByRole, async (req, res) => {
  console.log(`[v0] Fetching employee list for user ${req.user.email} (${req.user.role})`)
  try {
    let query = `
        SELECT e.*, u.email, u.first_name, u.last_name, u.role, d.name AS department_name
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN departments d ON d.id = e.department_id
    `
    
    const params = []
    
    // Apply role-based filtering
    if (req.employeeRoleFilter && req.employeeRoleFilter !== 'self') {
      query += ` WHERE u.role = $1`
      params.push(req.employeeRoleFilter)
    }
    
    query += ` ORDER BY e.created_at DESC NULLS LAST`

    const result = await pool.query(query, params)
    console.log(`[v0] Returning ${result.rowCount} employees`)
    res.json(result.rows.map((row) => mapEmployeeRow(row)))
  } catch (error) {
    console.error(`[v0] Error fetching employees: ${error.message}`)
    res.status(500).json({ detail: "Failed to fetch employees" })
  }
})

/**
 * ✅ GET /api/employees/:employee_id
 * Fetch details for a single employee
 */
router.get("/:employee_id", async (req, res) => {
  const { employee_id } = req.params
  console.log(`[v0] Fetching employee details for ${employee_id}`)

  try {
    const result = await pool.query(
      `
        SELECT e.*, u.email, u.first_name, u.last_name, u.role, d.name AS department_name
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.employee_id = $1 OR e.id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    res.json(mapEmployeeRow(result.rows[0]))
  } catch (error) {
    console.error(`[v0] Error fetching employee ${employee_id}: ${error.message}`)
    res.status(500).json({ detail: "Failed to fetch employee" })
  }
})

/**
 * ✅ POST /api/employees/
 * Create a new employee (with auto-generated employee ID)
 */
router.post("/", authenticateToken, requireHROrAdmin, canManageEmployee, extractCompanyId, async (req, res) => {
  const data = req.body
  console.log(`[v0] Creating new employee by user ${req.user.email} (${req.user.role})`)
  console.log(`[v0] Creating new employee with payload:`, data)
  console.log(`[v0] Using company ID: ${req.companyId}`)

  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Validate required fields (employee_id is now auto-generated)
    const requiredFields = ["first_name", "last_name", "email", "role"]
    const missing = requiredFields.filter((field) => !data[field])
    if (missing.length > 0) {
      return res.status(400).json({ detail: `Missing required fields: ${missing.join(", ")}` })
    }

    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : ""
    if (!email) {
      return res.status(400).json({ detail: "Email cannot be empty" })
    }

    // Check if email already exists for this company
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id = $2',
      [email, req.companyId]
    )
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ detail: "Email already exists in this company" })
    }

    // Validate role
    const validRoles = ['employee', 'hr_officer', 'payroll_officer', 'admin']
    const role = data.role || 'employee'
    if (!validRoles.includes(role)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ detail: "Invalid role. Must be one of: employee, hr_officer, payroll_officer, admin" })
    }

    // Determine year of joining
    const dateOfJoining = data.date_of_joining || new Date().toISOString().split('T')[0]
    const yearOfJoining = new Date(dateOfJoining).getFullYear()

    // Generate employee ID
    const employeeCode = await generateEmployeeId(
      req.companyId,
      data.first_name,
      data.last_name,
      yearOfJoining
    )

    // Default password is the employee ID
    const hashedPassword = await bcrypt.hash(employeeCode, 10)

    // Create user account with role
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, company_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [email, hashedPassword, role, data.first_name, data.last_name, req.companyId]
    )
    const userId = userResult.rows[0].id

    // Create employee record (department_id can be null now)
    const employeeResult = await client.query(
      `INSERT INTO employees (
        user_id,
        employee_id,
        designation,
        date_of_joining,
        employment_type,
        work_location,
        date_of_birth,
        phone_number,
        address,
        city,
        state,
        postal_code,
        country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        userId,
        employeeCode,
        data.position || data.designation || 'Employee',
        dateOfJoining,
        data.employment_type || 'full-time',
        data.work_location || null,
        data.date_of_birth || null,
        data.phone || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.postal_code || null,
        data.country || null
      ]
    )

    await client.query('COMMIT')

    const employee = employeeResult.rows[0]
    
    res.json({
      message: "Employee created successfully",
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        user_id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: email,
        department: data.department,
        designation: employee.designation,
        date_of_joining: employee.date_of_joining,
        default_password: employeeCode, // Return for initial setup
      }
    })

  } catch (error) {
    await client.query('ROLLBACK')
    
    if (error.code === "23505") {
      console.error("[v0] Employee creation failed - duplicate entry", error.detail)
      return res.status(400).json({ detail: "Employee with same ID or email already exists" })
    }

    console.error(`[v0] Error creating employee: ${error.message}`)
    res.status(500).json({ detail: `Failed to create employee: ${error.message}` })
  } finally {
    client.release()
  }
})

router.delete("/:employee_id", async (req, res) => {
  const { employee_id } = req.params
  console.log(`[v0] Deleting employee ${employee_id}`)

  try {
  const result = await pool.query("DELETE FROM employees WHERE employee_id = $1 OR id::text = $1 RETURNING employee_id", [
      employee_id,
    ])

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    res.json({ message: "Employee deleted successfully" })
  } catch (error) {
    console.error(`[v0] Error deleting employee ${employee_id}: ${error.message}`)
    res.status(500).json({ detail: "Failed to delete employee" })
  }
})

/**
 * ✅ PUT /api/employees/:employee_id
 * Update core employee details
 */
router.put("/:employee_id", authenticateToken, requireHROrAdmin, canManageEmployee, extractCompanyId, async (req, res) => {
  const { employee_id } = req.params
  const data = req.body
  console.log(`[v0] Updating employee ${employee_id} by user ${req.user.email} (${req.user.role})`)
  console.log(`[v0] Updating employee ${employee_id} with payload:`, data)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Get existing employee with user info
    const existingResult = await client.query(
      `
        SELECT e.*, u.id as user_id, u.email, u.first_name, u.last_name, u.role, d.name AS department_name
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.employee_id = $1 OR e.id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )

    if (existingResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ detail: "Employee not found" })
    }

    const existing = existingResult.rows[0]
    
    // HR officers can only update employees with role "employee"
    if (req.user.role === 'hr_officer' && existing.role !== 'employee') {
      await client.query('ROLLBACK')
      return res.status(403).json({ 
        detail: `HR Officers can only update employees with role "employee". This employee has role: ${existing.role}` 
      })
    }

    // Prepare updates for users table
    const userUpdates = []
    const userParams = []

    if (data.first_name !== undefined) {
      const firstName = data.first_name?.trim()
      if (!firstName) {
        await client.query('ROLLBACK')
        return res.status(400).json({ detail: "First name cannot be empty" })
      }
      userParams.push(firstName)
      userUpdates.push(`first_name = $${userParams.length}`)
    }

    if (data.last_name !== undefined) {
      const lastName = data.last_name?.trim()
      if (!lastName) {
        await client.query('ROLLBACK')
        return res.status(400).json({ detail: "Last name cannot be empty" })
      }
      userParams.push(lastName)
      userUpdates.push(`last_name = $${userParams.length}`)
    }

    if (data.email !== undefined) {
      const email = data.email?.trim().toLowerCase()
      if (!email) {
        await client.query('ROLLBACK')
        return res.status(400).json({ detail: "Email cannot be empty" })
      }

      const duplicate = await client.query(
        `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 AND company_id = $3 LIMIT 1`,
        [email, existing.user_id, req.companyId]
      )

      if (duplicate.rowCount > 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ detail: "Another employee already uses that email" })
      }

      userParams.push(email)
      userUpdates.push(`email = $${userParams.length}`)
    }

    // Update users table if there are changes
    if (userUpdates.length > 0) {
      userParams.push(existing.user_id)
      await client.query(
        `UPDATE users 
         SET ${userUpdates.join(", ")}, updated_at = NOW() 
         WHERE id = $${userParams.length}`,
        userParams
      )
    }

    // Prepare updates for employees table
    const empUpdates = []
    const empParams = []

    if (data.phone !== undefined) {
      empParams.push(toNullable(data.phone))
      empUpdates.push(`phone_number = $${empParams.length}`)
    }

    if (data.position !== undefined) {
      const position = data.position?.trim()
      if (!position) {
        await client.query('ROLLBACK')
        return res.status(400).json({ detail: "Position cannot be empty" })
      }
      empParams.push(position)
      empUpdates.push(`designation = $${empParams.length}`)
    }

    if (data.employment_type !== undefined) {
      empParams.push(toNullable(data.employment_type))
      empUpdates.push(`employment_type = $${empParams.length}`)
    }

    if (data.date_of_joining !== undefined) {
      empParams.push(toNullable(data.date_of_joining))
      empUpdates.push(`date_of_joining = $${empParams.length}`)
    }

    if (data.date_of_birth !== undefined) {
      empParams.push(toNullable(data.date_of_birth))
      empUpdates.push(`date_of_birth = $${empParams.length}`)
    }

    if (data.department !== undefined) {
      const departmentName = data.department?.trim()
      if (!departmentName) {
        await client.query('ROLLBACK')
        return res.status(400).json({ detail: "Department cannot be empty" })
      }

      const departmentId = await ensureDepartment(departmentName, req.companyId)
      empParams.push(departmentId)
      empUpdates.push(`department_id = $${empParams.length}`)
    }

    // Update employees table if there are changes
    if (empUpdates.length > 0) {
      empParams.push(existing.id)
      await client.query(
        `UPDATE employees 
         SET ${empUpdates.join(", ")}, updated_at = NOW() 
         WHERE id = $${empParams.length}`,
        empParams
      )
    }

    if (userUpdates.length === 0 && empUpdates.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ detail: "No updatable fields provided" })
    }

    await client.query('COMMIT')

    await client.query('COMMIT')

    // Fetch the updated employee with user info
    const refreshed = await client.query(
      `
        SELECT e.*, u.email, u.first_name, u.last_name, d.name AS department_name
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.employee_id = $1 OR e.id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )
    const refreshedRow = refreshed.rows[0]

    client.release()
    res.json({ message: "Employee updated successfully", employee: mapEmployeeRow(refreshedRow) })
  } catch (error) {
    await client.query('ROLLBACK')
    client.release()
    
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Employees: table missing during update")
      return res.status(500).json({ detail: "Employee storage is not configured" })
    }

    console.error(`[v0] Error updating employee ${employee_id}:`, error.message)
    res.status(500).json({ detail: "Failed to update employee" })
  }
})

/**
 * ✅ GET /api/employees/:employee_id/profile
 * Fetch profile details for an employee
 */
router.get("/:employee_id/profile", async (req, res) => {
  const { employee_id } = req.params
  console.log(`[v0] Fetching profile for employee: ${employee_id}`)

  let employeeRow = null

  try {
    employeeRow = await findEmployeeRowByIdentifier(employee_id)
    if (!employeeRow) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    await ensureEmployeeProfilesTable()

    const employeeCode = employeeRow.employee_id

    const profileResult = await pool.query(
      `
        SELECT 
          employee_id,
          about,
          job_love,
          interests,
          skills,
          certifications,
          manager,
          location,
          gender,
          marital_status,
          nationality,
          company,
          mobile,
          date_of_birth,
          date_of_joining,
          residing_address,
          personal_email,
          account_number,
          bank_name,
          ifsc_code,
          pan_no,
          uan_no,
          emp_code
        FROM employee_profiles
        WHERE employee_id = $1
        LIMIT 1
      `,
      [employeeCode]
    )

    if (profileResult.rowCount === 0) {
      return res.json({
        employee_id: employeeCode,
        name: `${employeeRow.first_name ?? ""} ${employeeRow.last_name ?? ""}`.trim(),
        email: employeeRow.email,
        department: employeeRow.department_name ?? null,
        phone: employeeRow.phone,
        mobile: employeeRow.phone,
        position: employeeRow.position,
        company: "",
        location: "",
        about: "",
        job_love: "",
        skills: [],
        certifications: [],
        manager: "",
        interests: "",
        gender: "",
        marital_status: "",
        nationality: "",
        date_of_joining: employeeRow.date_of_joining,
        date_of_birth: employeeRow.date_of_birth,
        residing_address: "",
        personal_email: "",
        account_number: "",
        bank_name: "",
        ifsc_code: "",
        pan_no: "",
        uan_no: "",
        emp_code: employeeRow.employee_id,
      })
    }

    const profile = profileResult.rows[0]
    res.json({
      employee_id: employeeCode,
      name: `${employeeRow.first_name ?? ""} ${employeeRow.last_name ?? ""}`.trim(),
      email: employeeRow.email,
      department: employeeRow.department_name ?? null,
      phone: employeeRow.phone,
      mobile: profile.mobile ?? employeeRow.phone,
      position: employeeRow.position,
      about: profile.about ?? "",
      job_love: profile.job_love ?? "",
      interests: profile.interests ?? "",
      skills: safeParseJson(profile.skills, []),
      certifications: safeParseJson(profile.certifications, []),
      manager: profile.manager ?? "",
      location: profile.location ?? "",
      gender: profile.gender ?? "",
      marital_status: profile.marital_status ?? "",
      nationality: profile.nationality ?? "",
      date_of_joining: profile.date_of_joining ?? employeeRow.date_of_joining,
      date_of_birth: profile.date_of_birth ?? employeeRow.date_of_birth,
      company: profile.company ?? "",
      residing_address: profile.residing_address ?? "",
      personal_email: profile.personal_email ?? "",
      account_number: profile.account_number ?? "",
      bank_name: profile.bank_name ?? "",
      ifsc_code: profile.ifsc_code ?? "",
      pan_no: profile.pan_no ?? "",
      uan_no: profile.uan_no ?? "",
      emp_code: profile.emp_code ?? employeeRow.employee_id,
    })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE && employeeRow) {
      console.warn("[v0] employee_profiles table missing, returning fallback profile")
      return res.json({
        employee_id: employeeRow.employee_id,
        name: `${employeeRow.first_name ?? ""} ${employeeRow.last_name ?? ""}`.trim(),
        email: employeeRow.email,
        department: employeeRow.department_name ?? null,
        phone: employeeRow.phone,
        mobile: employeeRow.phone,
        position: employeeRow.position,
        company: "",
        location: "",
        about: "",
        job_love: "",
        skills: [],
        certifications: [],
        manager: "",
        interests: "",
        gender: "",
        marital_status: "",
        nationality: "",
        date_of_joining: employeeRow.date_of_joining,
        date_of_birth: employeeRow.date_of_birth,
        residing_address: "",
        personal_email: "",
        account_number: "",
        bank_name: "",
        ifsc_code: "",
        pan_no: "",
        uan_no: "",
        emp_code: employeeRow.employee_id,
      })
    }

    console.error(`[v0] Error fetching profile ${employee_id}: ${error.message}`)
    res.status(500).json({ detail: "Failed to fetch profile" })
  }
})

/**
 * ✅ PUT /api/employees/:employee_id/profile
 * Update or create an employee profile
 */
router.put("/:employee_id/profile", extractCompanyId, async (req, res) => {
  const { employee_id } = req.params
  const data = req.body
  console.log(`[v0] Updating profile for employee: ${employee_id}`)

  try {
    const employeeRow = await findEmployeeRowByIdentifier(employee_id)
    if (!employeeRow) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    await ensureEmployeeProfilesTable()

    const employeeUuid = employeeRow.id
    const employeeCode = employeeRow.employee_id

    const departmentName = typeof data.department === "string" ? data.department.trim() : ""
    const departmentId = departmentName ? await ensureDepartment(departmentName, req.companyId) : null

    const employeeUpdateValues = [employeeUuid]
    const employeeSetStatements = []

    if (data.mobile !== undefined) {
      employeeUpdateValues.push(toNullable(data.mobile))
      employeeSetStatements.push(`phone = $${employeeUpdateValues.length}`)
    }

    if (data.date_of_birth !== undefined) {
      employeeUpdateValues.push(toNullable(data.date_of_birth))
      employeeSetStatements.push(`date_of_birth = $${employeeUpdateValues.length}`)
    }

    if (data.date_of_joining !== undefined && toNullable(data.date_of_joining) !== null) {
      employeeUpdateValues.push(toNullable(data.date_of_joining))
      employeeSetStatements.push(`date_of_joining = $${employeeUpdateValues.length}`)
    }

    if (departmentId) {
      employeeUpdateValues.push(departmentId)
      employeeSetStatements.push(`department_id = $${employeeUpdateValues.length}`)
    }

    if (employeeSetStatements.length > 0) {
      employeeSetStatements.push("updated_at = NOW()")
      await pool.query(
        `
          UPDATE employees
          SET ${employeeSetStatements.join(", ")}
          WHERE id = $1
        `,
        employeeUpdateValues
      )
    }

    await pool.query(
      `
        INSERT INTO employee_profiles (
          employee_id,
          about,
          job_love,
          interests,
          skills,
          certifications,
          manager,
          location,
          gender,
          marital_status,
          nationality,
          company,
          mobile,
          date_of_birth,
          residing_address,
          personal_email,
          date_of_joining,
          account_number,
          bank_name,
          ifsc_code,
          pan_no,
          uan_no,
          emp_code,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW())
        ON CONFLICT (employee_id)
        DO UPDATE SET
          about = EXCLUDED.about,
          job_love = EXCLUDED.job_love,
          interests = EXCLUDED.interests,
          skills = EXCLUDED.skills,
          certifications = EXCLUDED.certifications,
          manager = EXCLUDED.manager,
          location = EXCLUDED.location,
          gender = EXCLUDED.gender,
          marital_status = EXCLUDED.marital_status,
          nationality = EXCLUDED.nationality,
          company = EXCLUDED.company,
          mobile = EXCLUDED.mobile,
          date_of_birth = EXCLUDED.date_of_birth,
          residing_address = EXCLUDED.residing_address,
          personal_email = EXCLUDED.personal_email,
          date_of_joining = EXCLUDED.date_of_joining,
          account_number = EXCLUDED.account_number,
          bank_name = EXCLUDED.bank_name,
          ifsc_code = EXCLUDED.ifsc_code,
          pan_no = EXCLUDED.pan_no,
          uan_no = EXCLUDED.uan_no,
          emp_code = EXCLUDED.emp_code,
          updated_at = NOW()
      `,
      [
        employeeCode,
        data.about || "",
        data.job_love || "",
        data.interests || "",
        JSON.stringify(data.skills || []),
        JSON.stringify(data.certifications || []),
        data.manager || "",
        data.location || "",
        data.gender || "",
        data.marital_status || "",
        data.nationality || "",
        toNullable(data.company),
        toNullable(data.mobile),
        toNullable(data.date_of_birth),
        toNullable(data.residing_address),
        toNullable(data.personal_email),
        toNullable(data.date_of_joining),
        toNullable(data.account_number),
        toNullable(data.bank_name),
        toNullable(data.ifsc_code),
        toNullable(data.pan_no),
        toNullable(data.uan_no),
        toNullable(data.emp_code) ?? employeeCode,
      ]
    )

    res.json({ message: "Profile updated successfully", employee_id: employeeCode })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] employee_profiles table missing during update")
      return res.status(500).json({ detail: "Profile storage is not configured" })
    }

    console.error(`[v0] Error updating profile ${employee_id}: ${error.message}`)
    res.status(500).json({ detail: "Failed to update profile" })
  }
})

/**
 * ✅ GET /api/employees/:employee_id/salary
 * Fetch salary info for employee
 */
router.get("/:employee_id/salary", async (req, res) => {
  const { employee_id } = req.params
  console.log(`[v0] Fetching salary info for employee: ${employee_id}`)

  try {
    await ensureEmployeeSalaryTable()

    const result = await pool.query("SELECT * FROM employee_salary WHERE employee_id = $1", [employee_id])

    if (result.rowCount === 0) {
      return res.json({
        employee_id,
        month_wage: 50000,
        yearly_wage: 600000,
        working_days_per_week: 5,
        break_time: 1,
        pf_rate: 12.0,
        professional_tax: 200.0,
        salary_components: [
          { id: "basic", name: "Basic Salary", computation_type: "percentage", value: 50.0 },
          { id: "hra", name: "House Rent Allowance", computation_type: "percentage", value: 50.0 },
        ],
      })
    }

    const row = result.rows[0]
    res.json({
      employee_id: row.employee_id,
      month_wage: row.month_wage,
      yearly_wage: row.yearly_wage,
      working_days_per_week: row.working_days_per_week,
      break_time: row.break_time,
      pf_rate: row.pf_rate,
      professional_tax: row.professional_tax,
      salary_components: safeParseJson(row.salary_components, []),
    })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] employee_salary table missing, returning default salary info")
      return res.json({
        employee_id,
        month_wage: 50000,
        yearly_wage: 600000,
        working_days_per_week: 5,
        break_time: 1,
        pf_rate: 12.0,
        professional_tax: 200.0,
        salary_components: [],
      })
    }

    console.error(`[v0] Error fetching salary ${employee_id}: ${error.message}`)
    res.status(500).json({ detail: "Failed to fetch salary" })
  }
})

/**
 * ✅ PUT /api/employees/:employee_id/salary
 * Update or create salary info
 */
router.put("/:employee_id/salary", async (req, res) => {
  const { employee_id } = req.params
  const data = req.body
  console.log(`[v0] Updating salary info for employee: ${employee_id}`)

  try {
    await ensureEmployeeSalaryTable()

    await pool.query(
      `
        INSERT INTO employee_salary (
          employee_id,
          month_wage,
          yearly_wage,
          working_days_per_week,
          break_time,
          pf_rate,
          professional_tax,
          salary_components,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        ON CONFLICT (employee_id)
        DO UPDATE SET
          month_wage = EXCLUDED.month_wage,
          yearly_wage = EXCLUDED.yearly_wage,
          working_days_per_week = EXCLUDED.working_days_per_week,
          break_time = EXCLUDED.break_time,
          pf_rate = EXCLUDED.pf_rate,
          professional_tax = EXCLUDED.professional_tax,
          salary_components = EXCLUDED.salary_components,
          updated_at = NOW()
      `,
      [
        employee_id,
        data.month_wage ?? null,
        data.yearly_wage ?? null,
        data.working_days_per_week ?? null,
        data.break_time ?? null,
        data.pf_rate ?? null,
        data.professional_tax ?? null,
        JSON.stringify(data.salary_components || []),
      ]
    )

    res.json({ message: "Salary information updated successfully", employee_id })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] employee_salary table missing during update")
      return res.status(500).json({ detail: "Salary storage is not configured" })
    }

    console.error(`[v0] Error updating salary ${employee_id}: ${error.message}`)
    res.status(500).json({ detail: "Failed to update salary information" })
  }
})

export default router;

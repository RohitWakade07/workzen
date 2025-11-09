import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import pool from "../config/database.js"

const router = express.Router()

const ACCESS_TOKEN_EXPIRE_MINUTES = 480  // 8 hours instead of 30 minutes
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"
const PG_UNDEFINED_TABLE = "42P01"
const PG_UNDEFINED_COLUMN = "42703"

async function ensureUserSchema(client) {
  if (!client) {
    return
  }

  try {
    await client.query(
      `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS employee_id UUID,
        ADD COLUMN IF NOT EXISTS company_id UUID,
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `
    )

    await client.query(`UPDATE users SET status = 'active' WHERE status IS NULL`)

    const unassignedCompanies = await client.query(`SELECT COUNT(1) AS count FROM users WHERE company_id IS NULL`)
    const missingCount = Number(unassignedCompanies.rows?.[0]?.count ?? 0)
    if (missingCount > 0) {
      console.warn(`[v0] Auth: ${missingCount} user(s) missing company_id. Assign appropriate company ids.`)
    }
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Auth: users table missing while ensuring schema")
      return
    }

    throw error
  }
}

async function ensureEmployeeSchema(client) {
  if (!client) {
    return
  }

  try {
    try {
      await client.query("ALTER TABLE employees DROP COLUMN IF EXISTS user_id CASCADE")
    } catch (error) {
      if (error.code !== PG_UNDEFINED_COLUMN && error.code !== PG_UNDEFINED_TABLE) {
        throw error
      }
    }

    await client.query(
      `
        ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS department_id UUID,
        ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'Employee',
        ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'Full-time',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS date_of_joining DATE,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `
    )

    await client.query(`UPDATE employees SET employment_type = 'Full-time' WHERE employment_type IS NULL`)
    await client.query(`UPDATE employees SET status = 'active' WHERE status IS NULL`)
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Auth: employees table missing while ensuring schema")
      return
    }

    throw error
  }
}

async function resetCompanyData(client) {
  console.log("[v0] Auth: resetCompanyData skipped (table truncation disabled)")
}

if (!process.env.JWT_SECRET) {
  console.warn("[v0] Auth: JWT_SECRET not set. Falling back to an insecure default. Set JWT_SECRET in your environment.")
}

const VALID_ROLES = ["employee", "hr_officer", "payroll_officer", "admin"]

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee_id ?? null,
      companyId: user.company_id ?? null,
    },
    JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
  )
}

function buildUserResponse(row) {
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim()

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status ? 'active' : 'inactive',
    companyId: row.company_id || null,
    employeeId: row.employee_id || null,
    name: fullName || row.email,
    department: row.department || null,
    createdAt: row.created_at || null,
  }
}

async function fetchUserWithDetailsByEmail(email) {
  if (!pool) {
    return null
  }

  const query = `
    SELECT
      u.id,
      u.email,
      u.password_hash,
      u.role,
      u.is_active as status,
      u.company_id,
      u.first_name,
      u.last_name,
      u.created_at,
      e.id as employee_id,
      d.name AS department
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE LOWER(u.email) = LOWER($1)
    LIMIT 1;
  `

  try {
    const result = await pool.query(query, [email])
    return result.rowCount > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("[v0] Auth: Error fetching user:", error.message)
    throw error
  }
}

async function fetchUserWithDetailsById(client, id) {
  const query = `
    SELECT
      u.id,
      u.email,
      u.role,
      u.is_active as status,
      u.company_id,
      u.first_name,
      u.last_name,
      u.created_at,
      e.id as employee_id,
      d.name AS department
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE u.id = $1
    LIMIT 1;
  `

  try {
    const result = await client.query(query, [id])
    return result.rowCount > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("[v0] Auth: Error fetching user by id:", error.message)
    throw error
  }
}

function splitName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return { firstName: "Admin", lastName: "User" }
  }

  const firstName = parts[0]
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : parts[0]

  return { firstName, lastName }
}

/**
 * Generate employee login ID in format: [CompanyCode][FirstName2][LastName2][Year][SerialNumber]
 * Example: OIJODO20220001
 */
async function generateEmployeeId(client, companyId, firstName, lastName, yearOfJoining) {
  try {
    // Get company name
    const companyResult = await client.query('SELECT name FROM companies WHERE id = $1', [companyId])
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
    const serialResult = await client.query(
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

async function ensureDepartment(client, name) {
  const lookup = await client.query("SELECT id FROM departments WHERE LOWER(name) = LOWER($1) LIMIT 1", [name])
  if (lookup.rowCount > 0) {
    return lookup.rows[0].id
  }

  const insert = await client.query(
    "INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id",
    [name, `${name} department`]
  )
  return insert.rows[0].id
}

async function createEmployeeRecord(client, fullName, email, departmentId, position = "Administrator") {
  const { firstName, lastName } = splitName(fullName)
  const employeeCode = `EMP${Math.random().toString().slice(2, 8)}`.slice(0, 20)
  const joiningDate = new Date().toISOString().split("T")[0]

  const insert = await client.query(
    `
      INSERT INTO employees (
        employee_id,
        first_name,
        last_name,
        email,
        department_id,
        position,
        employment_type,
        status,
        date_of_joining
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Full-time', 'active', $7)
      RETURNING id;
    `,
    [employeeCode, firstName, lastName, email.toLowerCase(), departmentId, position, joiningDate]
  )

  return insert.rows[0].id
}

async function upsertSetting(client, key, value, dataType = "string") {
  if (value === undefined || value === null) {
    return
  }

  try {
    await client.query(
      `
        INSERT INTO system_settings (setting_key, setting_value, data_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = EXCLUDED.setting_value, data_type = EXCLUDED.data_type, updated_at = NOW();
      `,
      [key, value, dataType]
    )
  } catch (error) {
    if (error.code !== PG_UNDEFINED_TABLE) {
      throw error
    }

    console.warn(`[v0] Auth: system_settings table missing while updating setting ${key}`)
  }
}

router.post("/signup", async (req, res) => {
  const { email, password, name, role, company } = req.body
  console.log(`[v0] Signup attempt for ${email} with role ${role}`)

  try {
    if (!pool) {
      return res.status(503).json({ detail: "Database not configured" })
    }

    if (!email || !password || !name) {
      return res.status(400).json({ detail: "Missing required fields" })
    }

    const normalizedRole = role && VALID_ROLES.includes(role) ? role : "admin"
    const { firstName, lastName } = splitName(name)

    // Check if user exists
    const existingUser = await fetchUserWithDetailsByEmail(email)
    if (existingUser) {
      return res.status(400).json({ detail: "User already exists" })
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      let companyId

      // Check if this is a company registration or user signup
      if (company && company.companyName) {
        // Create new company
        const companyResult = await client.query(
          `INSERT INTO companies (name, email, phone_number, subscription_plan, max_employees)
           VALUES ($1, $2, $3, 'basic', 50)
           RETURNING id`,
          [company.companyName, company.companyEmail || email, company.phone || null]
        )
        companyId = companyResult.rows[0].id
        console.log(`[v0] Created new company: ${company.companyName}`)
      } else {
        // For now, create a default company or require company info
        // In production, you should require company info
        return res.status(400).json({ 
          detail: "Company information required. Please provide company name." 
        })
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10)

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, company_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [email.toLowerCase(), hashedPassword, normalizedRole, firstName, lastName, companyId]
      )
      const userId = userResult.rows[0].id

      // Generate employee ID based on company and user details
      const currentYear = new Date().getFullYear()
      const employeeCode = await generateEmployeeId(client, companyId, firstName, lastName, currentYear)
      
      // Create employee record
      await client.query(
        `INSERT INTO employees (user_id, employee_id, designation, date_of_joining)
         VALUES ($1, $2, $3, CURRENT_DATE)`,
        [userId, employeeCode, normalizedRole === 'admin' ? 'Administrator' : 'Employee']
      )

      await client.query("COMMIT")
      console.log(`[v0] User created successfully: ${email} with employee ID: ${employeeCode}`)

      // Fetch complete user details
      const createdUser = await fetchUserWithDetailsById(client, userId)
      const token = generateAccessToken(createdUser)

      res.json({
        access_token: token,
        token_type: "bearer",
        user: buildUserResponse(createdUser),
        expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
      })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("[v0] Signup error:", error.message)

      if (error.code === "23505") {
        return res.status(400).json({ detail: "User or company already exists" })
      }

      if (error.code === "23503") {
        return res.status(400).json({ detail: "Invalid company reference" })
      }

      return res.status(500).json({ detail: "Signup failed: " + error.message })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("[v0] Signup error:", error.message)
    res.status(500).json({ detail: "Signup failed" })
  }
})

router.post("/login", async (req, res) => {
  const { email, password } = req.body
  console.log(`[v0] Login attempt for ${email}`)

  try {
    if (!pool) {
      return res.status(503).json({ detail: "Database not configured" })
    }

    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required" })
    }

    const userRow = await fetchUserWithDetailsByEmail(email)
    if (!userRow) {
      console.log(`[v0] Login failed - user not found: ${email}`)
      return res.status(401).json({ detail: "Invalid email or password" })
    }

    // Check if user is active (is_active column is boolean)
    if (!userRow.status || userRow.status === 'inactive') {
      console.log(`[v0] Login failed - inactive user: ${email}`)
      return res.status(403).json({ detail: "Account is not active" })
    }

    const validPassword = bcrypt.compareSync(password, userRow.password_hash)
    if (!validPassword) {
      console.log(`[v0] Login failed - invalid password for: ${email}`)
      return res.status(401).json({ detail: "Invalid email or password" })
    }

    const token = generateAccessToken(userRow)
    console.log(`[v0] Login successful for ${email} - role: ${userRow.role}`)

    res.json({
      access_token: token,
      token_type: "bearer",
      user: buildUserResponse(userRow),
      expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    })
  } catch (error) {
    console.error("[v0] Login error:", error.message)
    res.status(500).json({ detail: "Login failed" })
  }
})

router.post("/logout", (req, res) => {
  console.log("[v0] User logout request received")
  res.json({ message: "Logged out successfully" })
})

router.post("/refresh", async (req, res) => {
  const authHeader = req.headers.authorization
  console.log("[v0] Token refresh requested")

  if (!authHeader) {
    return res.status(401).json({ detail: "Missing token" })
  }

  const token = authHeader.split(" ")[1]
  try {
    // Verify token even if expired (to get user info)
    const decoded = jwt.decode(token)
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ detail: "Invalid token format" })
    }

    if (!pool) {
      return res.status(503).json({ detail: "Database not configured" })
    }

    const client = await pool.connect()
    try {
      const freshUser = await fetchUserWithDetailsById(client, decoded.id)
      if (!freshUser) {
        return res.status(404).json({ detail: "User not found" })
      }

      if (!freshUser.status || freshUser.status === 'inactive') {
        return res.status(403).json({ detail: "Account is not active" })
      }

      // Generate new token
      const newToken = generateAccessToken(freshUser)
      console.log(`[v0] Token refreshed for ${freshUser.email}`)

      res.json({
        access_token: newToken,
        token_type: "bearer",
        user: buildUserResponse(freshUser),
        expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.log("[v0] Token refresh failed", error.message)
    res.status(401).json({ detail: "Token refresh failed. Please login again." })
  }
})

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization
  console.log("[v0] Get current user request")

  if (!authHeader) {
    return res.status(401).json({ detail: "Missing token" })
  }

  const token = authHeader.split(" ")[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (!pool) {
      return res.status(503).json({ detail: "Database not configured" })
    }

    const client = await pool.connect()
    try {
      const freshUser = await fetchUserWithDetailsById(client, decoded.id)
      if (!freshUser) {
        return res.status(404).json({ detail: "User not found" })
      }

      if (!freshUser.status || freshUser.status === 'inactive') {
        return res.status(403).json({ detail: "Account is not active" })
      }

      res.json({
        user: buildUserResponse(freshUser)
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.log("[v0] Get current user failed", error.message)
    res.status(401).json({ detail: "Invalid or expired token" })
  }
})

router.get("/validate-token", async (req, res) => {
  const authHeader = req.headers.authorization
  console.log("[v0] Token validation requested")

  if (!authHeader) {
    return res.status(401).json({ valid: false, detail: "Missing token" })
  }

  const token = authHeader.split(" ")[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (!pool) {
      return res.json({
        valid: true,
        user: decoded,
        expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
      })
    }

    const client = await pool.connect()
    try {
      const freshUser = await fetchUserWithDetailsById(client, decoded.id)
      if (!freshUser) {
        return res.status(401).json({ valid: false, detail: "User no longer exists" })
      }

      if (!freshUser.status || freshUser.status === 'inactive') {
        return res.status(403).json({ valid: false, detail: "Account is not active" })
      }

      res.json({
        valid: true,
        user: buildUserResponse(freshUser),
        expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.log("[v0] Token validation failed", error.message)
    res.status(401).json({ valid: false, detail: "Invalid or expired token" })
  }
})

export default router

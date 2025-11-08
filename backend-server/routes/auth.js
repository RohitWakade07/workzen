import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import pool from "../config/database.js"

const router = express.Router()

const ACCESS_TOKEN_EXPIRE_MINUTES = 30
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
    status: row.status,
    employeeId: row.employee_id ?? null,
    name: fullName || row.email,
    department: row.department || null,
    lastLogin: row.last_login || null,
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
      u.status,
      u.employee_id,
      u.last_login,
      u.created_at,
      e.first_name,
      e.last_name,
      d.name AS department
    FROM users u
    LEFT JOIN employees e ON e.id = u.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE LOWER(u.email) = LOWER($1)
    LIMIT 1;
  `

  try {
    const result = await pool.query(query, [email])
    return result.rowCount > 0 ? result.rows[0] : null
  } catch (error) {
    if (error.code === PG_UNDEFINED_COLUMN) {
      console.warn("[v0] Auth: Detected legacy users schema. Attempting to patch...")
      await ensureUserSchema(pool)
      const result = await pool.query(query, [email])
      return result.rowCount > 0 ? result.rows[0] : null
    }

    throw error
  }
}

async function fetchUserWithDetailsById(client, id) {
  const query = `
    SELECT
      u.id,
      u.email,
      u.role,
      u.status,
      u.employee_id,
      u.last_login,
      u.created_at,
      e.first_name,
      e.last_name,
      d.name AS department
    FROM users u
    LEFT JOIN employees e ON e.id = u.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE u.id = $1
    LIMIT 1;
  `

  try {
    const result = await client.query(query, [id])
    return result.rowCount > 0 ? result.rows[0] : null
  } catch (error) {
    if (error.code === PG_UNDEFINED_COLUMN) {
      console.warn("[v0] Auth: Detected legacy users schema while fetching by id. Attempting to patch...")
      await ensureUserSchema(client)
      const result = await client.query(query, [id])
      return result.rowCount > 0 ? result.rows[0] : null
    }

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

    const existingUser = await fetchUserWithDetailsByEmail(email)
    if (existingUser) {
      return res.status(400).json({ detail: "User already exists" })
    }

    const client = await pool.connect()
    try {
    await client.query("BEGIN")

  await ensureUserSchema(client)
  await ensureEmployeeSchema(client)

    console.log("[v0] Signup: Resetting company data for new account")
    await resetCompanyData(client)

      const departmentName = company?.companyName ? `${company.companyName} Admin` : "Administration"
      const departmentId = await ensureDepartment(client, departmentName)

      const employeeId = await createEmployeeRecord(client, name, email, departmentId, "Administrator")

      const hashedPassword = bcrypt.hashSync(password, 10)

      let userInsert

      try {
        userInsert = await client.query(
          `
            INSERT INTO users (employee_id, email, password_hash, role, status)
            VALUES ($1, $2, $3, $4, 'active')
            RETURNING id;
          `,
          [employeeId, email.toLowerCase(), hashedPassword, normalizedRole]
        )
      } catch (error) {
        if (error.code === PG_UNDEFINED_COLUMN) {
          console.warn("[v0] Signup: Falling back to legacy users schema")
          const parsedName = splitName(name)
          userInsert = await client.query(
            `
              INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
              VALUES ($1, $2, $3, $4, $5, true)
              RETURNING id;
            `,
            [email.toLowerCase(), hashedPassword, normalizedRole, parsedName.firstName, parsedName.lastName]
          )
        } else {
          throw error
        }
      }

      if (company) {
        await upsertSetting(client, "company_name", company.companyName, "string")
        await upsertSetting(client, "company_phone", company.phone, "string")
        if (company.companyLogo) {
          await upsertSetting(client, "company_logo", company.companyLogo, "string")
        }
      }

      const createdUser = await fetchUserWithDetailsById(client, userInsert.rows[0].id)
      await client.query("COMMIT")

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
        return res.status(400).json({ detail: "User already exists" })
      }

      if (error.code === PG_UNDEFINED_TABLE) {
        return res.status(500).json({ detail: "Database tables not initialized" })
      }

      return res.status(500).json({ detail: "Signup failed" })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("[v0] Signup error:", error.message)
    if (error.code === PG_UNDEFINED_TABLE) {
      return res.status(500).json({ detail: "Database tables not initialized" })
    }

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

    if (userRow.status && userRow.status !== "active") {
      console.log(`[v0] Login failed - inactive user: ${email}`)
      return res.status(403).json({ detail: "Account is not active" })
    }

    const validPassword = bcrypt.compareSync(password, userRow.password_hash)
    if (!validPassword) {
      console.log(`[v0] Login failed - invalid password for: ${email}`)
      return res.status(401).json({ detail: "Invalid email or password" })
    }

    await pool.query("UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1", [userRow.id])

    const token = generateAccessToken(userRow)
    console.log(`[v0] Login successful for ${email} - role: ${userRow.role}`)

    res.json({
      access_token: token,
      token_type: "bearer",
      user: buildUserResponse({ ...userRow, last_login: new Date().toISOString() }),
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

      if (freshUser.status && freshUser.status !== "active") {
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

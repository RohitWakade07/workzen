import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import pool from "../config/database.js"

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"
const VALID_ROLES = ["employee", "hr_officer", "payroll_officer", "admin"]
const VALID_USER_STATUSES = new Set(["active", "inactive", "suspended"])
if (!process.env.JWT_SECRET) {
  console.warn("[v0] Admin: JWT_SECRET not set. Using insecure default. Configure JWT_SECRET in the environment.")
}

const PG_UNDEFINED_TABLE = "42P01"

function requireDatabase(res) {
  if (!pool) {
    res.status(503).json({ detail: "Database not configured" })
    return false
  }
  return true
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ detail: "Missing authorization header" })
  }

  const [, token] = authHeader.split(" ")
  if (!token) {
    return res.status(401).json({ detail: "Missing bearer token" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.role !== "admin") {
      return res.status(403).json({ detail: "Admin privileges required" })
    }

    req.user = decoded
    next()
  } catch (error) {
    console.log("[v0] Admin: Invalid token", error.message)
    return res.status(401).json({ detail: "Invalid or expired token" })
  }
}

function splitName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return { firstName: "User", lastName: "Admin" }
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

async function createEmployee(client, fullName, email, departmentId, position) {
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
      RETURNING id, employee_id;
    `,
    [employeeCode, firstName, lastName, email.toLowerCase(), departmentId, position, joiningDate]
  )

  const row = insert.rows[0]
  return { id: row.id, employeeCode: row.employee_id }
}

function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email,
    role: row.role,
    status: row.status ?? "active",
    department: row.department ?? null,
    lastLogin: row.last_login ?? null,
    createdAt: row.created_at ?? null,
  }
}

async function fetchUserWithDetailsById(client, id) {
  const result = await client.query(
    `
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
    `,
    [id]
  )

  return result.rowCount > 0 ? result.rows[0] : null
}

async function upsertSetting(client, key, value) {
  if (value === undefined) {
    return
  }

  let dataType = "string"
  let storedValue = value

  if (typeof value === "number") {
    dataType = "number"
  } else if (typeof value === "boolean") {
    dataType = "boolean"
    storedValue = value ? "true" : "false"
  } else if (typeof value === "object") {
    dataType = "json"
    storedValue = JSON.stringify(value)
  }

  try {
    await client.query(
      `
        INSERT INTO system_settings (setting_key, setting_value, data_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = EXCLUDED.setting_value, data_type = EXCLUDED.data_type, updated_at = NOW();
      `,
      [key, storedValue, dataType]
    )
  } catch (error) {
    if (error.code !== PG_UNDEFINED_TABLE) {
      throw error
    }

    console.warn(`[v0] Admin: system_settings table missing while updating setting ${key}`)
  }
}

router.use(requireAdmin)

router.get("/users", async (req, res) => {
  console.log("[v0] Admin: Fetching users list")

  if (!requireDatabase(res)) {
    return
  }

  try {
    const result = await pool.query(
      `
        SELECT
          u.id,
          u.email,
          u.role,
          u.status,
          u.last_login,
          u.created_at,
          e.first_name,
          e.last_name,
          d.name AS department
        FROM users u
        LEFT JOIN employees e ON e.id = u.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY u.created_at DESC NULLS LAST;
      `
    )

    const users = result.rows.map((row) => mapUserRow(row))
    res.json({ users })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Admin: Users table not initialized")
      return res.json({ users: [] })
    }

    console.error("[v0] Admin: Error fetching users", error)
    res.status(500).json({ detail: "Failed to fetch users" })
  }
})

router.post("/users", async (req, res) => {
  console.log("[v0] Admin: Creating new user")

  if (!requireDatabase(res)) {
    return
  }

  const { email, name, role = "employee", department = "General", status } = req.body

  if (!email || !name) {
    return res.status(400).json({ detail: "Email and name are required" })
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ detail: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` })
  }

  const normalizedStatus = status && VALID_USER_STATUSES.has(status) ? status : "active"

  try {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const existingUser = await client.query("SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email])
      if (existingUser.rowCount > 0) {
        await client.query("ROLLBACK")
        return res.status(400).json({ detail: "User already exists" })
      }

      const departmentId = await ensureDepartment(client, department)
      const employeeRecord = await createEmployee(
        client,
        name,
        email,
        departmentId,
        role === "admin" ? "Administrator" : role.replace("_", " ")
      )

      const hashedPassword = bcrypt.hashSync(employeeRecord.employeeCode, 10)

      const insert = await client.query(
        `
          INSERT INTO users (employee_id, email, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id;
        `,
        [employeeRecord.id, email.toLowerCase(), hashedPassword, role, normalizedStatus]
      )

      const createdUser = await fetchUserWithDetailsById(client, insert.rows[0].id)
      if (!createdUser) {
        throw new Error("User was created but could not be loaded")
      }

      await client.query("COMMIT")

      res.json({ message: "User created successfully", user: mapUserRow(createdUser) })
    } catch (error) {
      await client.query("ROLLBACK")

      if (error.code === "23505") {
        return res.status(400).json({ detail: "User already exists" })
      }

      console.error("[v0] Admin: Error creating user", error)
      if (error.code === PG_UNDEFINED_TABLE) {
        return res.status(500).json({ detail: "Database tables not initialized" })
      }

      res.status(500).json({ detail: "Failed to create user" })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("[v0] Admin: Unexpected error creating user", error)
    if (error.code === PG_UNDEFINED_TABLE) {
      return res.status(500).json({ detail: "Database tables not initialized" })
    }

    res.status(500).json({ detail: "Failed to create user" })
  }
})

router.put("/users/:id", async (req, res) => {
  const { id } = req.params
  const { name, role, department, status, password } = req.body
  console.log(`[v0] Admin: Updating user ${id}`)

  if (!requireDatabase(res)) {
    return
  }

  if ([name, role, department, status, password].every((value) => value === undefined)) {
    return res.status(400).json({ detail: "No updatable fields provided" })
  }

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ detail: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` })
  }

  try {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      const existing = await fetchUserWithDetailsById(client, id)
      if (!existing) {
        await client.query("ROLLBACK")
        return res.status(404).json({ detail: "User not found" })
      }

      const userUpdates = []
      const userParams = []

      if (role && role !== existing.role) {
        userParams.push(role)
        userUpdates.push(`role = $${userParams.length}`)
      }

      if (status && status !== existing.status) {
        if (!VALID_USER_STATUSES.has(status)) {
          await client.query("ROLLBACK")
          return res.status(400).json({ detail: "Invalid account status" })
        }

        userParams.push(status)
        userUpdates.push(`status = $${userParams.length}`)
      }

      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10)
        userParams.push(hashedPassword)
        userUpdates.push(`password_hash = $${userParams.length}`)
      }

      if (userUpdates.length > 0) {
        userParams.push(id)
        await client.query(
          `
            UPDATE users
            SET ${userUpdates.join(", ")}, updated_at = NOW()
            WHERE id = $${userParams.length};
          `,
          userParams
        )
      }

      if (existing.employee_id) {
        const employeeUpdates = []
        const employeeParams = []

        if (name) {
          const { firstName, lastName } = splitName(name)
          employeeParams.push(firstName)
          employeeParams.push(lastName)
          employeeUpdates.push(`first_name = $${employeeParams.length - 1}`)
          employeeUpdates.push(`last_name = $${employeeParams.length}`)
        }

        if (department !== undefined) {
          const departmentName = department?.trim()
          if (!departmentName) {
            await client.query("ROLLBACK")
            return res.status(400).json({ detail: "Department cannot be empty" })
          }

          const departmentId = await ensureDepartment(client, departmentName)
          employeeParams.push(departmentId)
          employeeUpdates.push(`department_id = $${employeeParams.length}`)
        }

        if (employeeUpdates.length > 0) {
          employeeParams.push(existing.employee_id)
          await client.query(
            `
              UPDATE employees
              SET ${employeeUpdates.join(", ")}, updated_at = NOW()
              WHERE id = $${employeeParams.length};
            `,
            employeeParams
          )
        }
      }

      const refreshed = await fetchUserWithDetailsById(client, id)
      await client.query("COMMIT")

      res.json({ message: "User updated successfully", user: mapUserRow(refreshed) })
    } catch (error) {
      await client.query("ROLLBACK")

      console.error(`[v0] Admin: Error updating user ${id}`, error)
      res.status(500).json({ detail: "Failed to update user" })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error(`[v0] Admin: Unexpected error updating user ${id}`, error)
    res.status(500).json({ detail: "Failed to update user" })
  }
})

router.delete("/users/:id", async (req, res) => {
  const { id } = req.params
  console.log(`[v0] Admin: Deleting user ${id}`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING employee_id", [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "User not found" })
    }

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("[v0] Admin: Error deleting user", error)
    res.status(500).json({ detail: "Failed to delete user" })
  }
})

router.get("/settings", async (req, res) => {
  console.log("[v0] Admin: Fetching system settings")

  if (!requireDatabase(res)) {
    return
  }

  try {
    const result = await pool.query("SELECT setting_key, setting_value, data_type FROM system_settings ORDER BY setting_key ASC")
    const settings = result.rows.reduce((acc, row) => {
      let value = row.setting_value

      if (row.data_type === "number") {
        value = Number(value)
      } else if (row.data_type === "boolean") {
        value = value === "true"
      } else if (row.data_type === "json") {
        try {
          value = JSON.parse(value)
        } catch (err) {
          console.log("[v0] Admin: Failed to parse JSON setting", row.setting_key, err.message)
        }
      }

      acc[row.setting_key] = value
      return acc
    }, {})

    res.json({ settings })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Admin: system_settings table not initialized")
      return res.json({ settings: {} })
    }

    console.error("[v0] Admin: Error fetching settings", error)
    res.status(500).json({ detail: "Failed to fetch settings" })
  }
})

router.post("/settings", async (req, res) => {
  console.log("[v0] Admin: Updating system settings")

  if (!requireDatabase(res)) {
    return
  }

  const payload = req.body?.settings ?? req.body ?? {}

  try {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      await Promise.all(
        Object.entries(payload).map(([key, value]) => {
          return upsertSetting(client, key, value)
        })
      )

      await client.query("COMMIT")

      res.json({ message: "Settings updated successfully" })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("[v0] Admin: Error updating settings", error)
      res.status(500).json({ detail: "Failed to update settings" })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("[v0] Admin: Unexpected error updating settings", error)
    res.status(500).json({ detail: "Failed to update settings" })
  }
})

router.get("/audit-logs", async (req, res) => {
  console.log("[v0] Admin: Fetching audit logs")

  if (!requireDatabase(res)) {
    return
  }

  try {
    const result = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100")
    res.json({ logs: result.rows })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Admin: audit_logs table not initialized")
      return res.json({ logs: [] })
    }

    console.error("[v0] Admin: Error fetching audit logs", error)
    res.status(500).json({ detail: "Failed to fetch audit logs" })
  }
})

export default router

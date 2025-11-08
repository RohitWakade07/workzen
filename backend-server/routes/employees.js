import express from "express"
import bcrypt from "bcryptjs"
import pool from "../config/database.js"

const router = express.Router()
const PG_UNDEFINED_TABLE = "42P01"
const VALID_EMPLOYEE_STATUSES = new Set(["active", "inactive", "on-leave"])

async function ensureDepartment(department) {
  if (!department) {
    return null
  }

  const lookup = await pool.query("SELECT id FROM departments WHERE LOWER(name) = LOWER($1) LIMIT 1", [department])
  if (lookup.rowCount > 0) {
    return lookup.rows[0].id
  }

  const created = await pool.query("INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING id", [department, `${department} department`])
  return created.rows[0].id
}

function mapEmployeeRow(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    employee_id: row.employee_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    department_id: row.department_id,
    department: row.department_name ?? row.department ?? null,
    position: row.position,
    employment_type: row.employment_type,
  status: row.status ?? "active",
    date_of_joining: row.date_of_joining,
    date_of_birth: row.date_of_birth,
    salary: row.salary,
    bank_account: row.bank_account,
    pan_number: row.pan_number,
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
      SELECT e.*, d.name AS department_name
      FROM employees e
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
router.get("/", async (req, res) => {
  console.log("[v0] Fetching employee list")
  try {
    const result = await pool.query(
      `
        SELECT e.*, d.name AS department_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY e.created_at DESC NULLS LAST
      `
    )
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
        SELECT e.*, d.name AS department_name
        FROM employees e
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
 * Create a new employee
 */
router.post("/", async (req, res) => {
  const data = req.body
  console.log(`[v0] Creating new employee with payload:`, data)

  try {
    const requiredFields = ["employee_id", "first_name", "last_name", "email", "department"]
    const missing = requiredFields.filter((field) => !data[field])
    if (missing.length > 0) {
      return res.status(400).json({ detail: `Missing required fields: ${missing.join(", ")}` })
    }

    const employeeCode = typeof data.employee_id === "string" ? data.employee_id.trim() : `${data.employee_id}`.trim()
    if (employeeCode.length === 0) {
      return res.status(400).json({ detail: "Employee ID cannot be empty" })
    }

    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : ""
    if (!email) {
      return res.status(400).json({ detail: "Email cannot be empty" })
    }

    const departmentId = await ensureDepartment(data.department)
    if (!departmentId) {
      return res.status(400).json({ detail: "Invalid department" })
    }

    const statusValue = (data.status || "active").toLowerCase()
    if (!VALID_EMPLOYEE_STATUSES.has(statusValue)) {
      return res.status(400).json({ detail: "Invalid employment status" })
    }

    const insertResult = await pool.query(
      `
        INSERT INTO employees (
          employee_id,
          first_name,
          last_name,
          email,
          phone,
          department_id,
          position,
          employment_type,
          status,
          date_of_joining,
          date_of_birth,
          salary,
          bank_account,
          pan_number
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `,
      [
        employeeCode,
        data.first_name,
        data.last_name,
    email,
        data.phone || null,
        departmentId,
        data.position || "Employee",
        data.employment_type || "Full-time",
  statusValue,
        data.date_of_joining || new Date().toISOString().split("T")[0],
        data.date_of_birth || null,
        data.salary || null,
        data.bank_account || null,
        data.pan_number || null,
      ]
    )

    const insertedRow = insertResult.rows[0]

    try {
      await syncEmployeeUserAccount(insertedRow, email, employeeCode, statusValue)
    } catch (syncError) {
      console.error(`[v0] Failed to sync user account for employee ${data.employee_id}:`, syncError.message)
    }

    const normalized = mapEmployeeRow({ ...insertedRow, department_name: data.department })
    res.json({ message: "Employee created successfully", employee: normalized })
  } catch (error) {
    if (error.code === "23505") {
      console.error("[v0] Employee creation failed - duplicate entry", error.detail)
      return res.status(400).json({ detail: "Employee with same ID or email already exists" })
    }

    console.error(`[v0] Error creating employee: ${error.message}`)
    res.status(500).json({ detail: "Failed to create employee" })
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
router.put("/:employee_id", async (req, res) => {
  const { employee_id } = req.params
  const data = req.body
  console.log(`[v0] Updating employee ${employee_id} with payload:`, data)

  try {
    const existingResult = await pool.query(
      `
        SELECT e.*, d.name AS department_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
  WHERE e.employee_id = $1 OR e.id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )

    if (existingResult.rowCount === 0) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const existing = existingResult.rows[0]

    const updates = []
    const params = []

    if (data.first_name !== undefined) {
      const firstName = data.first_name?.trim()
      if (!firstName) {
        return res.status(400).json({ detail: "First name cannot be empty" })
      }

      params.push(firstName)
      updates.push(`first_name = $${params.length}`)
    }

    if (data.last_name !== undefined) {
      const lastName = data.last_name?.trim()
      if (!lastName) {
        return res.status(400).json({ detail: "Last name cannot be empty" })
      }

      params.push(lastName)
      updates.push(`last_name = $${params.length}`)
    }

    if (data.email !== undefined) {
      const email = data.email?.trim().toLowerCase()
      if (!email) {
        return res.status(400).json({ detail: "Email cannot be empty" })
      }

      const duplicate = await pool.query(
        `SELECT 1 FROM employees WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
        [email, existing.id]
      )

      if (duplicate.rowCount > 0) {
        return res.status(400).json({ detail: "Another employee already uses that email" })
      }

      params.push(email)
      updates.push(`email = $${params.length}`)
    }

    if (data.phone !== undefined) {
      params.push(toNullable(data.phone))
      updates.push(`phone = $${params.length}`)
    }

    if (data.position !== undefined) {
      const position = data.position?.trim()
      if (!position) {
        return res.status(400).json({ detail: "Position cannot be empty" })
      }

      params.push(position)
      updates.push(`position = $${params.length}`)
    }

    if (data.employment_type !== undefined) {
      params.push(toNullable(data.employment_type))
      updates.push(`employment_type = $${params.length}`)
    }

    if (data.status !== undefined) {
      const status = data.status?.trim().toLowerCase()
      if (!status) {
        return res.status(400).json({ detail: "Status cannot be empty" })
      }

      if (!VALID_EMPLOYEE_STATUSES.has(status)) {
        return res.status(400).json({ detail: "Invalid employment status" })
      }

      params.push(status)
      updates.push(`status = $${params.length}`)
    }

    if (data.date_of_joining !== undefined) {
      params.push(toNullable(data.date_of_joining))
      updates.push(`date_of_joining = $${params.length}`)
    }

    if (data.date_of_birth !== undefined) {
      params.push(toNullable(data.date_of_birth))
      updates.push(`date_of_birth = $${params.length}`)
    }

    if (data.salary !== undefined) {
      params.push(toNullable(data.salary))
      updates.push(`salary = $${params.length}`)
    }

    if (data.bank_account !== undefined) {
      params.push(toNullable(data.bank_account))
      updates.push(`bank_account = $${params.length}`)
    }

    if (data.pan_number !== undefined) {
      params.push(toNullable(data.pan_number))
      updates.push(`pan_number = $${params.length}`)
    }

    if (data.department !== undefined) {
      const departmentName = data.department?.trim()
      if (!departmentName) {
        return res.status(400).json({ detail: "Department cannot be empty" })
      }

      const departmentId = await ensureDepartment(departmentName)
      params.push(departmentId)
      updates.push(`department_id = $${params.length}`)
    }

    if (updates.length === 0) {
      return res.status(400).json({ detail: "No updatable fields provided" })
    }

    params.push(existing.employee_id)

    await pool.query(
      `
  UPDATE employees
  SET ${updates.join(", ")}, updated_at = NOW()
  WHERE employee_id = $${params.length} OR id::text = $${params.length}
      `,
      params
    )

    const refreshed = await pool.query(
      `
        SELECT e.*, d.name AS department_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
  WHERE e.employee_id = $1 OR e.id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )
    const refreshedRow = refreshed.rows[0]

    try {
      await syncEmployeeUserAccount(
        refreshedRow,
        refreshedRow.email,
        refreshedRow.employee_id,
        refreshedRow.status || existing.status
      )
    } catch (syncError) {
      console.error(
        `[v0] Employees: Failed to sync user account during update for ${employee_id}:`,
        syncError.message
      )
    }

    res.json({ message: "Employee updated successfully", employee: mapEmployeeRow(refreshedRow) })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Employees: table missing during update")
      return res.status(500).json({ detail: "Employee storage is not configured" })
    }

    console.error(`[v0] Error updating employee ${employee_id}: ${error.message}`)
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
router.put("/:employee_id/profile", async (req, res) => {
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
    const departmentId = departmentName ? await ensureDepartment(departmentName) : null

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

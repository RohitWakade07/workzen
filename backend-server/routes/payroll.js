import express from "express"
import pool from "../config/database.js"

const router = express.Router()
const PG_UNDEFINED_TABLE = "42P01"

function requireDatabase(res) {
  if (!pool) {
    res.status(503).json({ detail: "Database not configured" })
    return false
  }

  return true
}

async function ensurePayrollTables(db = pool) {
  if (!db) {
    return
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS payroll_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_uuid UUID NOT NULL,
      employee_code VARCHAR(50) NOT NULL,
      employee_name VARCHAR(150) NOT NULL,
      month INT NOT NULL,
      month_label VARCHAR(20) NOT NULL,
      year INT NOT NULL,
      total_working_days INT DEFAULT 0,
      payable_days INT DEFAULT 0,
      unpaid_leaves INT DEFAULT 0,
      net_salary NUMERIC(12, 2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      company_id UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(employee_uuid, year, month)
    );
  `)
}

function mapPayrollRecord(row) {
  return {
    id: row.id,
    employeeId: row.employee_code,
    employeeName: row.employee_name,
    totalWorkingDays: Number(row.total_working_days || 0),
    payableDays: Number(row.payable_days || 0),
    unpaidLeaves: Number(row.unpaid_leaves || 0),
    netSalary: Number(row.net_salary || 0),
    status: row.status || "draft",
    month: row.month,
    year: row.year,
  }
}

function mapPayrunSummary(row) {
  return {
    month: Number(row.month),
    monthLabel: row.month_label,
    year: Number(row.year),
    employeeCount: Number(row.employees || 0),
    totalAmount: Number(row.total_amount || 0),
    statuses: row.statuses || [],
  }
}

function parseMonthInput(monthInput) {
  if (typeof monthInput === "number" && monthInput >= 1 && monthInput <= 12) {
    const label = new Date(2000, monthInput - 1, 1).toLocaleString("default", { month: "long" })
    return { monthNumber: monthInput, monthLabel: label }
  }

  if (typeof monthInput === "string" && monthInput.trim().length > 0) {
    const normalized = monthInput.trim()
    const parsed = Date.parse(`${normalized} 1, 2000`)
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed)
      return {
        monthNumber: date.getMonth() + 1,
        monthLabel: date.toLocaleString("default", { month: "long" }),
      }
    }
  }

  const fallbackDate = new Date()
  return {
    monthNumber: fallbackDate.getMonth() + 1,
    monthLabel: fallbackDate.toLocaleString("default", { month: "long" }),
  }
}

router.get("/records", async (req, res) => {
  console.log("[v0] Payroll: Fetching payroll records")

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensurePayrollTables()

    const result = await pool.query(
      `
        SELECT pr.*
        FROM payroll_records pr
        ORDER BY pr.year DESC, pr.month DESC, pr.employee_name ASC
      `
    )

    res.json({ records: result.rows.map(mapPayrollRecord) })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: payroll_records table missing")
      return res.json({ records: [] })
    }

    console.error("[v0] Payroll: Error fetching payroll records", error)
    res.status(500).json({ detail: "Failed to fetch payroll records" })
  }
})

router.post("/runs", async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  const { month, year } = req.body
  const safeYear = Number.parseInt(year, 10) || new Date().getFullYear()
  const { monthNumber, monthLabel } = parseMonthInput(month)

  console.log(`[v0] Payroll: Generating payrun for ${monthLabel} ${safeYear}`)

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await ensurePayrollTables(client)

    const employees = await client.query(
      `
        SELECT
          e.id AS employee_uuid,
          e.employee_id AS employee_code,
          COALESCE(NULLIF(TRIM(e.first_name || ' ' || e.last_name), ''), e.employee_id) AS employee_name,
          COALESCE(es.month_wage, e.salary, 0) AS monthly_salary
        FROM employees e
        LEFT JOIN employee_salary es ON es.employee_id = e.employee_id
        WHERE e.status IS NULL OR e.status = 'active'
      `
    )

    if (employees.rowCount === 0) {
      await client.query("ROLLBACK")
      return res.status(200).json({ message: "No employees available for payroll", created: 0 })
    }

    const totalWorkingDays = 22
    const payableDays = 22
    const unpaidLeaves = 0

    for (const row of employees.rows) {
      await client.query(
        `
          INSERT INTO payroll_records (
            employee_uuid,
            employee_code,
            employee_name,
            month,
            month_label,
            year,
            total_working_days,
            payable_days,
            unpaid_leaves,
            net_salary,
            status,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', NOW())
          ON CONFLICT (employee_uuid, year, month)
          DO UPDATE SET
            employee_code = EXCLUDED.employee_code,
            employee_name = EXCLUDED.employee_name,
            month_label = EXCLUDED.month_label,
            total_working_days = EXCLUDED.total_working_days,
            payable_days = EXCLUDED.payable_days,
            unpaid_leaves = EXCLUDED.unpaid_leaves,
            net_salary = EXCLUDED.net_salary,
            status = 'draft',
            updated_at = NOW()
        `,
        [
          row.employee_uuid,
          row.employee_code,
          row.employee_name,
          monthNumber,
          monthLabel,
          safeYear,
          totalWorkingDays,
          payableDays,
          unpaidLeaves,
          Number(row.monthly_salary || 0),
        ]
      )
    }

    await client.query("COMMIT")

    res.json({ message: `Payrun generated for ${monthLabel} ${safeYear}`, created: employees.rowCount })
  } catch (error) {
    await client.query("ROLLBACK")

    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: Required tables missing while generating payrun", error.message)
      return res.status(500).json({ detail: "Payroll tables not initialized" })
    }

    console.error("[v0] Payroll: Failed to generate payrun", error)
    res.status(500).json({ detail: "Failed to create payrun" })
  } finally {
    client.release()
  }
})

router.get("/runs", async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensurePayrollTables()

    const result = await pool.query(
      `
        SELECT
          year,
          month,
          MAX(month_label) AS month_label,
          COUNT(*) AS employees,
          SUM(net_salary) AS total_amount,
          ARRAY_AGG(status) AS statuses
        FROM payroll_records
        GROUP BY year, month
        ORDER BY year DESC, month DESC
      `
    )

    res.json({ payruns: result.rows.map(mapPayrunSummary) })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: payroll_records table missing while fetching runs")
      return res.json({ payruns: [] })
    }

    console.error("[v0] Payroll: Failed to fetch payrun summaries", error)
    res.status(500).json({ detail: "Failed to fetch payruns" })
  }
})

router.put("/records/:id", async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  const { id } = req.params
  const { totalWorkingDays, payableDays, unpaidLeaves, netSalary, status } = req.body

  try {
    await ensurePayrollTables()

    const result = await pool.query(
      `
        UPDATE payroll_records
        SET
          total_working_days = COALESCE($2, total_working_days),
          payable_days = COALESCE($3, payable_days),
          unpaid_leaves = COALESCE($4, unpaid_leaves),
          net_salary = COALESCE($5, net_salary),
          status = COALESCE($6, status),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        totalWorkingDays !== undefined ? Number(totalWorkingDays) : null,
        payableDays !== undefined ? Number(payableDays) : null,
        unpaidLeaves !== undefined ? Number(unpaidLeaves) : null,
        netSalary !== undefined ? Number(netSalary) : null,
        status || null,
      ]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Payroll record not found" })
    }

    res.json({ message: "Payroll record updated", record: mapPayrollRecord(result.rows[0]) })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: payroll_records table missing while updating")
      return res.status(404).json({ detail: "Payroll records not initialized" })
    }

    console.error("[v0] Payroll: Failed to update record", error)
    res.status(500).json({ detail: "Failed to update payroll record" })
  }
})

router.delete("/records/:id", async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  const { id } = req.params

  try {
    await ensurePayrollTables()

    const result = await pool.query("DELETE FROM payroll_records WHERE id = $1", [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Payroll record not found" })
    }

    res.json({ message: "Payroll record deleted" })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: payroll_records table missing while deleting")
      return res.status(404).json({ detail: "Payroll records not initialized" })
    }

    console.error("[v0] Payroll: Failed to delete record", error)
    res.status(500).json({ detail: "Failed to delete payroll record" })
  }
})

router.get("/:employee_id/payslips", async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  const { employee_id } = req.params
  console.log(`[v0] Payroll: Fetching payslips for employee ${employee_id}`)

  try {
    const employeeLookup = await pool.query(
      `
        SELECT id
        FROM employees
        WHERE employee_id = $1 OR id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )

    if (employeeLookup.rowCount === 0) {
      return res.json({ employee_id, payslips: [] })
    }

    const employeeUuid = employeeLookup.rows[0].id
    const result = await pool.query(
      `
        SELECT *
        FROM payslips
        WHERE employee_id = $1
        ORDER BY created_at DESC
      `,
      [employeeUuid]
    )

    res.json({ employee_id, payslips: result.rows })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: payslips table missing")
      return res.json({ employee_id, payslips: [] })
    }

    console.error(`[v0] Payroll: Error fetching payslips for ${employee_id}`, error)
    res.status(500).json({ detail: "Failed to fetch payslips" })
  }
})

router.post("/:employee_id/payslips", async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  const { employee_id } = req.params
  const { payrollRunId, grossSalary, totalDeductions, netSalary, workingDays, presentDays, absentDays } = req.body

  try {
    const employeeLookup = await pool.query(
      `
        SELECT id
        FROM employees
        WHERE employee_id = $1 OR id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )

    if (employeeLookup.rowCount === 0) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const employeeUuid = employeeLookup.rows[0].id

    const result = await pool.query(
      `
        INSERT INTO payslips (
          payroll_run_id,
          employee_id,
          gross_salary,
          total_deductions,
          net_salary,
          working_days,
          present_days,
          absent_days
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        payrollRunId || null,
        employeeUuid,
        grossSalary ?? null,
        totalDeductions ?? null,
        netSalary ?? null,
        workingDays ?? null,
        presentDays ?? null,
        absentDays ?? null,
      ]
    )

    res.json({ message: "Payslip generated successfully", payslip: result.rows[0] })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: payslips table missing while creating payslip")
      return res.status(500).json({ detail: "Payslip storage not initialized" })
    }

    console.error(`[v0] Payroll: Error creating payslip for ${employee_id}`, error)
    res.status(500).json({ detail: "Failed to generate payslip" })
  }
})

export default router

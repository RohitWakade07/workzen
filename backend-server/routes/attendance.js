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

async function findEmployeeByIdentifier(identifier) {
  if (!identifier || !pool) {
    return null
  }

  const result = await pool.query(
    `
      SELECT id, employee_id, first_name, last_name
      FROM employees
      WHERE employee_id = $1 OR id::text = $1
      LIMIT 1
    `,
    [identifier]
  )

  return result.rowCount > 0 ? result.rows[0] : null
}

function formatTime(value) {
  if (!value) {
    return "--"
  }

  try {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch (error) {
    console.warn("[v0] Attendance: Failed to format time", error)
    return "--"
  }
}

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString().split("T")[0]
  }

  try {
    return new Date(value).toISOString().split("T")[0]
  } catch (error) {
    console.warn("[v0] Attendance: Failed to format date", error)
    return new Date().toISOString().split("T")[0]
  }
}

function mapAttendanceRow(row) {
  const nameParts = [row.first_name, row.last_name].filter(Boolean)
  const employeeName = nameParts.length > 0 ? nameParts.join(" ").trim() : row.employee_name || row.employee_code || "Unknown"

  return {
    id: row.id,
    employeeId: row.employee_code || row.employee_id,
    employeeName,
    checkInTime: formatTime(row.check_in_time),
    checkOutTime: formatTime(row.check_out_time),
    workHours: Number(row.hours_worked || 0),
    breakTime: Number(row.break_time || 0),
    status: row.status || "present",
    date: toIsoDate(row.check_in_time || row.check_out_time),
  }
}

async function loadAttendanceRecordById(id) {
  const query = await pool.query(
    `
      SELECT ar.*, e.employee_id AS employee_code, e.first_name, e.last_name
      FROM attendance_records ar
      LEFT JOIN employees e ON e.id = ar.employee_id
      WHERE ar.id = $1
      LIMIT 1
    `,
    [id]
  )

  return query.rowCount > 0 ? query.rows[0] : null
}

router.post("/check-in", async (req, res) => {
  console.log("[v0] Attendance: Check-in request received")

  if (!requireDatabase(res)) {
    return
  }

  const { employeeId } = req.body

  if (!employeeId) {
    return res.status(400).json({ detail: "employeeId is required" })
  }

  try {
    const employee = await findEmployeeByIdentifier(employeeId)
    if (!employee) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const today = new Date().toISOString().split("T")[0]

    const existing = await pool.query(
      `
        SELECT id
        FROM attendance_records
        WHERE employee_id = $1 AND DATE(check_in_time) = $2::date
        ORDER BY check_in_time ASC
        LIMIT 1
      `,
      [employee.id, today]
    )

    let recordId

    if (existing.rowCount > 0) {
      const updated = await pool.query(
        `
          UPDATE attendance_records
          SET check_in_time = NOW(), status = 'present', updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [existing.rows[0].id]
      )
      recordId = updated.rows[0].id
    } else {
      const inserted = await pool.query(
        `
          INSERT INTO attendance_records (employee_id, check_in_time, status)
          VALUES ($1, NOW(), 'present')
          RETURNING id
        `,
        [employee.id]
      )
      recordId = inserted.rows[0].id
    }

    const joined = await loadAttendanceRecordById(recordId)
    res.json({ message: "Check-in recorded successfully", record: mapAttendanceRow(joined) })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Attendance: attendance_records table missing during check-in")
      return res.status(500).json({ detail: "Attendance storage is not configured" })
    }

    console.error("[v0] Attendance: Error during check-in", error)
    res.status(500).json({ detail: "Internal server error" })
  }
})

router.post("/check-out", async (req, res) => {
  console.log("[v0] Attendance: Check-out request received")

  if (!requireDatabase(res)) {
    return
  }

  const { employeeId } = req.body

  if (!employeeId) {
    return res.status(400).json({ detail: "employeeId is required" })
  }

  try {
    const employee = await findEmployeeByIdentifier(employeeId)
    if (!employee) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const today = new Date().toISOString().split("T")[0]

    const existing = await pool.query(
      `
        SELECT id, check_in_time
        FROM attendance_records
        WHERE employee_id = $1 AND DATE(check_in_time) = $2::date
        ORDER BY check_in_time ASC
        LIMIT 1
      `,
      [employee.id, today]
    )

    if (existing.rowCount === 0) {
      return res.status(404).json({ detail: "Check-in record not found for today" })
    }

    const existingRow = existing.rows[0]
    const checkInTime = existingRow.check_in_time ? new Date(existingRow.check_in_time) : new Date()
    const now = new Date()
    const hoursWorked = Math.max(0, (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60))

    const updated = await pool.query(
      `
        UPDATE attendance_records
        SET check_out_time = NOW(), hours_worked = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [existingRow.id, Number(hoursWorked.toFixed(2))]
    )

    const joined = await loadAttendanceRecordById(updated.rows[0].id)
    res.json({ message: "Check-out recorded successfully", record: mapAttendanceRow(joined) })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Attendance: attendance_records table missing during check-out")
      return res.status(500).json({ detail: "Attendance storage is not configured" })
    }

    console.error("[v0] Attendance: Error during check-out", error)
    res.status(500).json({ detail: "Internal server error" })
  }
})

router.get("/", async (req, res) => {
  console.log("[v0] Attendance: Fetching daily records")

  if (!requireDatabase(res)) {
    return
  }

  try {
    const today = new Date().toISOString().split("T")[0]
    const result = await pool.query(
      `
        SELECT ar.*, e.employee_id AS employee_code, e.first_name, e.last_name
        FROM attendance_records ar
        LEFT JOIN employees e ON e.id = ar.employee_id
        WHERE DATE(ar.check_in_time) = $1::date
        ORDER BY ar.check_in_time DESC NULLS LAST
      `,
      [today]
    )

    const mapped = result.rows.map((row) => mapAttendanceRow(row))
    const stats = {
      presentToday: mapped.filter((r) => r.status === "present").length,
      absent: mapped.filter((r) => r.status === "absent").length,
      onLeave: mapped.filter((r) => r.status === "on_leave").length,
      halfDay: mapped.filter((r) => r.status === "half_day").length,
    }

    res.json({ records: mapped, stats })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Attendance: attendance_records table missing during fetch")
      return res.status(500).json({ detail: "Attendance storage is not configured" })
    }

    console.error("[v0] Attendance: Error fetching records", error)
    res.status(500).json({ detail: "Internal server error" })
  }
})

router.get("/:emp_id", async (req, res) => {
  const { emp_id } = req.params
  console.log(`[v0] Attendance: Fetching records for ${emp_id}`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    const employee = await findEmployeeByIdentifier(emp_id)
    if (!employee) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const result = await pool.query(
      `
        SELECT ar.*, e.employee_id AS employee_code, e.first_name, e.last_name
        FROM attendance_records ar
        LEFT JOIN employees e ON e.id = ar.employee_id
        WHERE ar.employee_id = $1
        ORDER BY ar.check_in_time DESC NULLS LAST
      `,
      [employee.id]
    )

    const mapped = result.rows.map((row) => mapAttendanceRow(row))
    const stats = {
      totalDaysPresent: mapped.filter((r) => r.status === "present").length,
      pendingApprovals: 0,
      totalWorkHours: mapped.reduce((sum, r) => sum + Number(r.workHours || 0), 0),
    }

    res.json({ employee_id: employee.employee_id, records: mapped, stats })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Attendance: attendance_records table missing during fetch by employee")
      return res.status(500).json({ detail: "Attendance storage is not configured" })
    }

    console.error("[v0] Attendance: Error fetching employee attendance", error)
    res.status(500).json({ detail: "Internal server error" })
  }
})

router.delete("/", async (req, res) => {
  console.log("[v0] Attendance: Purge all attendance records request received")

  if (!requireDatabase(res)) {
    return
  }

  try {
    await pool.query("TRUNCATE TABLE attendance_records RESTART IDENTITY CASCADE")
    res.json({ message: "All attendance records removed" })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Attendance: attendance_records table missing during purge")
      return res.status(404).json({ detail: "Attendance storage not found" })
    }

    console.error("[v0] Attendance: Failed to purge attendance records", error)
    res.status(500).json({ detail: "Failed to remove attendance records" })
  }
})

export default router

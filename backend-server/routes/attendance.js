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
      SELECT e.id, e.employee_id, u.first_name, u.last_name
      FROM employees e
      JOIN users u ON u.id = e.user_id
      WHERE e.employee_id = $1 OR e.id::text = $1
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
      SELECT ar.*, e.employee_id AS employee_code, u.first_name, u.last_name
      FROM attendance_records ar
      LEFT JOIN employees e ON e.id = ar.employee_id
      LEFT JOIN users u ON u.id = e.user_id
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

    // Check if there's an open session (no checkout) for today
    const openSession = await pool.query(
      `
        SELECT id, check_in_time
        FROM attendance_records
        WHERE employee_id = $1 AND date = $2::date AND check_out_time IS NULL
        ORDER BY check_in_time DESC
        LIMIT 1
      `,
      [employee.id, today]
    )

    if (openSession.rowCount > 0) {
      // Employee already has an open session - return error
      return res.status(400).json({ 
        detail: "You already have an open check-in session. Please check out first before starting a new session.",
        openSessionId: openSession.rows[0].id,
        checkInTime: formatTime(openSession.rows[0].check_in_time)
      })
    }

    // Always create a new session record
    const inserted = await pool.query(
      `
        INSERT INTO attendance_records (employee_id, date, check_in_time, status)
        VALUES ($1, $2::date, NOW(), 'present')
        RETURNING id
      `,
      [employee.id, today]
    )
    const recordId = inserted.rows[0].id
    
    console.log(`[v0] Attendance: Created new check-in session for employee ${employeeId}`)

    // Create notification for HR and Admin
    try {
      // Count existing sessions to determine if this is first check-in of the day
      const sessionCount = await pool.query(
        `SELECT COUNT(*) as count FROM attendance_records WHERE employee_id = $1 AND date = $2::date`,
        [employee.id, today]
      )
      
      const isFirstSession = sessionCount.rows[0].count === '1'
      const notificationMessage = isFirstSession
        ? `${employee.first_name} ${employee.last_name} (${employee.employee_id}) has checked in at ${new Date().toLocaleTimeString()}`
        : `${employee.first_name} ${employee.last_name} (${employee.employee_id}) started a new session at ${new Date().toLocaleTimeString()}`

      await pool.query(
        `
          INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
          SELECT u.id, $1, $2, 'attendance', $3, 'attendance_record'
          FROM users u
          WHERE u.role IN ('hr_officer', 'admin')
        `,
        [
          isFirstSession ? "Employee Checked In" : "Employee Started New Session",
          notificationMessage,
          recordId,
        ]
      )
      console.log(`[v0] Attendance: Notifications sent to HR/Admin for check-in`)
    } catch (notifError) {
      // Don't fail the check-in if notification fails
      console.warn("[v0] Attendance: Failed to create notifications", notifError)
    }

    const joined = await loadAttendanceRecordById(recordId)
    res.json({ 
      message: "Check-in recorded successfully", 
      record: mapAttendanceRow(joined),
      isNewSession: true
    })
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

    // Find the most recent open session (no check_out_time) for today
    const openSession = await pool.query(
      `
        SELECT id, check_in_time
        FROM attendance_records
        WHERE employee_id = $1 AND date = $2::date AND check_out_time IS NULL
        ORDER BY check_in_time DESC
        LIMIT 1
      `,
      [employee.id, today]
    )

    if (openSession.rowCount === 0) {
      return res.status(404).json({ detail: "No open check-in session found for today. Please check in first." })
    }

    const sessionRow = openSession.rows[0]

    // Calculate hours worked for this session
    const checkInTime = sessionRow.check_in_time ? new Date(sessionRow.check_in_time) : new Date()
    const now = new Date()
    const hoursWorked = Math.max(0, (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60))

    // Update the open session with check-out time
    const updated = await pool.query(
      `
        UPDATE attendance_records
        SET check_out_time = NOW(), 
            hours_worked = $2, 
            updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [sessionRow.id, Number(hoursWorked.toFixed(2))]
    )

    console.log(`[v0] Attendance: Check-out recorded for employee ${employeeId}, session hours: ${hoursWorked.toFixed(2)}`)

    // Calculate total hours for the day across all sessions
    const totalHoursResult = await pool.query(
      `
        SELECT COALESCE(SUM(hours_worked), 0) as total_hours
        FROM attendance_records
        WHERE employee_id = $1 AND date = $2::date AND check_out_time IS NOT NULL
      `,
      [employee.id, today]
    )
    const totalDailyHours = Number(totalHoursResult.rows[0].total_hours)

    // Create notification for HR, Admin, and Payroll officers
    try {
      await pool.query(
        `
          INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
          SELECT u.id, $1, $2, 'attendance', $3, 'attendance_record'
          FROM users u
          WHERE u.role IN ('hr_officer', 'admin', 'payroll_officer')
        `,
        [
          "Employee Checked Out",
          `${employee.first_name} ${employee.last_name} (${employee.employee_id}) checked out. Session: ${hoursWorked.toFixed(2)}h | Total today: ${totalDailyHours.toFixed(2)}h`,
          updated.rows[0].id,
        ]
      )
      console.log(`[v0] Attendance: Notifications sent to HR/Admin/Payroll for check-out`)
    } catch (notifError) {
      // Don't fail the check-out if notification fails
      console.warn("[v0] Attendance: Failed to create notifications", notifError)
    }

    const joined = await loadAttendanceRecordById(updated.rows[0].id)
    res.json({ 
      message: "Check-out recorded successfully", 
      record: mapAttendanceRow(joined),
      sessionHours: Number(hoursWorked.toFixed(2)),
      totalDailyHours: Number(totalDailyHours.toFixed(2))
    })
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
    
    // Get all sessions for today
    const sessionsResult = await pool.query(
      `
        SELECT ar.*, e.employee_id AS employee_code, u.first_name, u.last_name
        FROM attendance_records ar
        LEFT JOIN employees e ON e.id = ar.employee_id
        LEFT JOIN users u ON u.id = e.user_id
        WHERE ar.date = $1::date
        ORDER BY e.employee_id, ar.check_in_time ASC
      `,
      [today]
    )

    // Get aggregated data per employee
    const aggregatedResult = await pool.query(
      `
        SELECT 
          e.id as employee_db_id,
          e.employee_id AS employee_code,
          u.first_name,
          u.last_name,
          COUNT(*) as session_count,
          COALESCE(SUM(ar.hours_worked), 0) as total_hours,
          MIN(ar.check_in_time) as first_check_in,
          MAX(ar.check_out_time) as last_check_out,
          COUNT(CASE WHEN ar.check_out_time IS NULL THEN 1 END) as open_sessions,
          ARRAY_AGG(
            json_build_object(
              'id', ar.id,
              'checkIn', ar.check_in_time,
              'checkOut', ar.check_out_time,
              'hours', ar.hours_worked
            ) ORDER BY ar.check_in_time
          ) as sessions
        FROM attendance_records ar
        LEFT JOIN employees e ON e.id = ar.employee_id
        LEFT JOIN users u ON u.id = e.user_id
        WHERE ar.date = $1::date
        GROUP BY e.id, e.employee_id, u.first_name, u.last_name
        ORDER BY u.last_name, u.first_name
      `,
      [today]
    )

    // Map individual session records
    const allSessions = sessionsResult.rows.map((row) => mapAttendanceRow(row))
    
    // Map aggregated employee data
    const employeeSummaries = aggregatedResult.rows.map((row) => {
      const nameParts = [row.first_name, row.last_name].filter(Boolean)
      const employeeName = nameParts.length > 0 ? nameParts.join(" ").trim() : "Unknown"
      
      return {
        employeeId: row.employee_code,
        employeeName,
        sessionCount: Number(row.session_count),
        totalHours: Number(row.total_hours || 0),
        firstCheckIn: formatTime(row.first_check_in),
        lastCheckOut: formatTime(row.last_check_out),
        hasOpenSession: row.open_sessions > 0,
        status: row.open_sessions > 0 ? 'checked_in' : 'checked_out',
        sessions: row.sessions
      }
    })

    const stats = {
      totalEmployees: aggregatedResult.rowCount,
      currentlyCheckedIn: employeeSummaries.filter((e) => e.hasOpenSession).length,
      totalSessions: sessionsResult.rowCount,
      presentToday: employeeSummaries.length,
      absent: 0, // Would need to query all employees to calculate
      onLeave: 0,
      halfDay: 0,
    }

    res.json({ 
      records: allSessions,  // All individual sessions
      employeeSummaries,      // Aggregated data per employee
      stats 
    })
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

    // Get all sessions for this employee
    const sessionsResult = await pool.query(
      `
        SELECT ar.*, e.employee_id AS employee_code, u.first_name, u.last_name
        FROM attendance_records ar
        LEFT JOIN employees e ON e.id = ar.employee_id
        LEFT JOIN users u ON u.id = e.user_id
        WHERE ar.employee_id = $1
        ORDER BY ar.date DESC, ar.check_in_time ASC
      `,
      [employee.id]
    )

    // Get daily summaries
    const dailySummaries = await pool.query(
      `
        SELECT 
          ar.date,
          COUNT(*) as session_count,
          COALESCE(SUM(ar.hours_worked), 0) as total_hours,
          MIN(ar.check_in_time) as first_check_in,
          MAX(ar.check_out_time) as last_check_out,
          COUNT(CASE WHEN ar.check_out_time IS NULL THEN 1 END) as open_sessions,
          ARRAY_AGG(
            json_build_object(
              'id', ar.id,
              'checkIn', ar.check_in_time,
              'checkOut', ar.check_out_time,
              'hours', ar.hours_worked,
              'status', ar.status
            ) ORDER BY ar.check_in_time
          ) as sessions
        FROM attendance_records ar
        WHERE ar.employee_id = $1
        GROUP BY ar.date
        ORDER BY ar.date DESC
      `,
      [employee.id]
    )

    // Map all individual sessions
    const allSessions = sessionsResult.rows.map((row) => mapAttendanceRow(row))
    
    // Map daily summaries
    const dailyRecords = dailySummaries.rows.map((row) => ({
      date: toIsoDate(row.date),
      sessionCount: Number(row.session_count),
      totalHours: Number(row.total_hours || 0),
      firstCheckIn: formatTime(row.first_check_in),
      lastCheckOut: formatTime(row.last_check_out),
      hasOpenSession: row.open_sessions > 0,
      status: row.open_sessions > 0 ? 'in_progress' : 'completed',
      sessions: row.sessions
    }))

    // Calculate overall stats
    const stats = {
      totalDays: dailySummaries.rowCount,
      totalSessions: sessionsResult.rowCount,
      totalWorkHours: allSessions.reduce((sum, r) => sum + Number(r.workHours || 0), 0),
      averageHoursPerDay: dailySummaries.rowCount > 0 
        ? (allSessions.reduce((sum, r) => sum + Number(r.workHours || 0), 0) / dailySummaries.rowCount).toFixed(2)
        : 0,
      daysWithMultipleSessions: dailyRecords.filter(d => d.sessionCount > 1).length,
      currentOpenSessions: dailyRecords[0]?.hasOpenSession ? 1 : 0
    }

    res.json({ 
      employee_id: employee.employee_id,
      records: allSessions,        // All individual sessions
      dailyRecords,                // Aggregated by day
      stats 
    })
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

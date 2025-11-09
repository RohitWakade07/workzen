import express from "express"
import pool from "../config/database.js"
import { authenticateToken, requireHROrAdmin } from "../middleware/auth.js"

const router = express.Router()
const PG_UNDEFINED_TABLE = "42P01"

function requireDatabase(res) {
  if (!pool) {
    res.status(503).json({ detail: "Database not configured" })
    return false
  }
  return true
}

async function ensureTimeOffTables() {
  if (!pool) {
    return
  }

  try {
    // Check if time_off_requests table exists
    await pool.query("SELECT 1 FROM time_off_requests LIMIT 1")
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.log("[v0] Leave: Creating time_off_requests table")
      await pool.query(`
        CREATE TABLE IF NOT EXISTS time_off_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL,
          request_type VARCHAR(20) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          reason TEXT NOT NULL,
          days_requested INT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          approval_notes TEXT,
          approved_by UUID,
          approved_at TIMESTAMP,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date),
          CONSTRAINT days_requested_positive CHECK (days_requested > 0),
          CONSTRAINT valid_request_type CHECK (request_type IN ('vacation', 'sick', 'personal', 'unpaid')),
          CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
        )
      `)
    }
  }

  try {
    // Check if leave_allocations table exists
    await pool.query("SELECT 1 FROM leave_allocations LIMIT 1")
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.log("[v0] Leave: Creating leave_allocations table")
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leave_allocations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL,
          fiscal_year INT NOT NULL,
          vacation_days INT DEFAULT 20,
          sick_days INT DEFAULT 10,
          personal_days INT DEFAULT 3,
          unpaid_days INT DEFAULT 0,
          vacation_used INT DEFAULT 0,
          sick_used INT DEFAULT 0,
          personal_used INT DEFAULT 0,
          unpaid_used INT DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT days_not_negative CHECK (vacation_days >= 0 AND sick_days >= 0 AND personal_days >= 0 AND unpaid_days >= 0),
          CONSTRAINT used_not_negative CHECK (vacation_used >= 0 AND sick_used >= 0 AND personal_used >= 0 AND unpaid_used >= 0),
          UNIQUE(employee_id, fiscal_year)
        )
      `)
    }
  }
}

async function findEmployeeByIdentifier(identifier) {
  if (!identifier || !pool) {
    return null
  }

  const result = await pool.query(
    `
      SELECT 
        e.id, 
        e.employee_id, 
        u.first_name, 
        u.last_name, 
        u.email
      FROM employees e
      JOIN users u ON u.id = e.user_id
      WHERE e.employee_id = $1 OR e.id::text = $1 OR u.email = $1
      LIMIT 1
    `,
    [identifier]
  )

  return result.rowCount > 0 ? result.rows[0] : null
}

function mapTimeOffRequest(row) {
  const nameParts = [row.first_name, row.last_name].filter(Boolean)
  const employeeName = nameParts.length > 0 ? nameParts.join(" ").trim() : row.email || "Unknown"

  return {
    id: row.id,
    employeeId: row.employee_code || row.employee_id,
    employeeName,
    startDate: row.start_date,
    endDate: row.end_date,
    type: row.request_type === "vacation" ? "paid" : row.request_type,
    status: row.status,
    days: row.days_requested,
    reason: row.reason,
    approvalNotes: row.approval_notes,
    submittedAt: row.submitted_at,
  }
}

// GET /api/leave/balance/:id
router.get("/balance/:id", async (req, res) => {
  const { id } = req.params
  console.log(`[v0] Leave: Fetching balance for ${id}`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensureTimeOffTables()

    const employee = await findEmployeeByIdentifier(id)
    if (!employee) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const currentYear = new Date().getFullYear()

    // Get or create allocation for current year
    let allocation = await pool.query(
      `SELECT * FROM leave_allocations WHERE employee_id = $1 AND fiscal_year = $2`,
      [employee.id, currentYear]
    )

    if (allocation.rowCount === 0) {
      // Create default allocation
      await pool.query(
        `
          INSERT INTO leave_allocations (employee_id, fiscal_year, vacation_days, sick_days, personal_days)
          VALUES ($1, $2, 20, 10, 3)
        `,
        [employee.id, currentYear]
      )

      allocation = await pool.query(
        `SELECT * FROM leave_allocations WHERE employee_id = $1 AND fiscal_year = $2`,
        [employee.id, currentYear]
      )
    }

    const alloc = allocation.rows[0]

    res.json({
      employee_id: id,
      balance: {
        vacation: alloc.vacation_days - alloc.vacation_used,
        sick: alloc.sick_days - alloc.sick_used,
        personal: alloc.personal_days - alloc.personal_used,
      },
    })
  } catch (error) {
    console.error("[v0] Leave: Error fetching balance", error)
    res.status(500).json({ detail: "Failed to fetch leave balance" })
  }
})

// POST /api/leave/request
router.post("/request", async (req, res) => {
  console.log("[v0] Leave: New request submitted")

  if (!requireDatabase(res)) {
    return
  }

  const { employeeId, type, startDate, endDate, reason, days } = req.body

  if (!employeeId || !type || !startDate || !endDate || !reason || !days) {
    return res.status(400).json({ detail: "Missing required fields" })
  }

  try {
    await ensureTimeOffTables()

    const employee = await findEmployeeByIdentifier(employeeId)
    if (!employee) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    // Map frontend types to DB types
    const requestType = type === "paid" ? "vacation" : type

    const result = await pool.query(
      `
        INSERT INTO time_off_requests (employee_id, request_type, start_date, end_date, reason, days_requested, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id
      `,
      [employee.id, requestType, startDate, endDate, reason, days]
    )

    // Create notifications for HR and Admin
    try {
      const userResult = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role 
         FROM users u 
         JOIN employees e ON e.user_id = u.id 
         WHERE e.id = $1`,
        [employee.id]
      )

      const requester = userResult.rows[0]
      const requesterName = requester ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim() || requester.email : 'Unknown'
      const requesterRole = requester?.role || 'employee'

      // Determine who should be notified based on requester's role
      let targetRoles = []
      if (requesterRole === 'employee') {
        // Employees: notify HR and Admin
        targetRoles = ['hr_officer', 'admin']
      } else if (requesterRole === 'hr_officer') {
        // HR: notify only Admin
        targetRoles = ['admin']
      }

      if (targetRoles.length > 0) {
        const notificationMessage = `${requesterName} has requested ${type} leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()} (${days} days)`

        // Get all users with target roles
        const targetUsers = await pool.query(
          `SELECT id FROM users WHERE role = ANY($1) AND is_active = true`,
          [targetRoles]
        )

        // Create notifications for each target user
        for (const targetUser of targetUsers.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, message, reference_id, reference_type)
             VALUES ($1, 'leave', $2, $3, 'leave_request')`,
            [targetUser.id, notificationMessage, result.rows[0].id]
          )
        }

        console.log(`[v0] Leave: Created notifications for ${targetUsers.rowCount} users with roles:`, targetRoles)
      }
    } catch (notifError) {
      console.error("[v0] Leave: Error creating notifications", notifError)
      // Don't fail the request if notifications fail
    }

    res.json({
      message: "Leave request submitted successfully",
      request: { id: result.rows[0].id },
    })
  } catch (error) {
    console.error("[v0] Leave: Error creating request", error)
    res.status(500).json({ detail: "Failed to create leave request" })
  }
})

// GET /api/leave/requests - Get all leave requests (for admin/HR)
router.get("/requests", authenticateToken, requireHROrAdmin, async (req, res) => {
  console.log("[v0] Leave: Fetching all requests")

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensureTimeOffTables()

    const result = await pool.query(
      `
        SELECT tor.*, e.employee_id AS employee_code, u.first_name, u.last_name, u.email
        FROM time_off_requests tor
        LEFT JOIN employees e ON e.id = tor.employee_id
        LEFT JOIN users u ON u.id = e.user_id
        ORDER BY tor.submitted_at DESC
      `
    )

    const requests = result.rows.map(mapTimeOffRequest)

    // Calculate stats
    const currentYear = new Date().getFullYear()
    const allocations = await pool.query(
      `
        SELECT 
          SUM(vacation_days - vacation_used) as total_paid,
          SUM(sick_days - sick_used) as total_sick
        FROM leave_allocations
        WHERE fiscal_year = $1
      `,
      [currentYear]
    )

    const stats = {
      totalPaidTimeOff: Number(allocations.rows[0]?.total_paid || 0),
      totalSickTimeOff: Number(allocations.rows[0]?.total_sick || 0),
      pendingApprovals: requests.filter((r) => r.status === "pending").length,
    }

    res.json({ requests, stats })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Leave: Tables missing, returning empty data")
      return res.json({ requests: [], stats: { totalPaidTimeOff: 0, totalSickTimeOff: 0, pendingApprovals: 0 } })
    }

    console.error("[v0] Leave: Error fetching requests", error)
    res.status(500).json({ detail: "Failed to fetch leave requests" })
  }
})

// GET /api/leave/requests/:id - Get leave requests for specific employee
router.get("/requests/:id", async (req, res) => {
  const { id } = req.params
  console.log(`[v0] Leave: Fetching requests for ${id}`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensureTimeOffTables()

    const employee = await findEmployeeByIdentifier(id)
    if (!employee) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const result = await pool.query(
      `
        SELECT tor.*, e.employee_id AS employee_code, u.first_name, u.last_name, u.email
        FROM time_off_requests tor
        LEFT JOIN employees e ON e.id = tor.employee_id
        LEFT JOIN users u ON u.id = e.user_id
        WHERE tor.employee_id = $1
        ORDER BY tor.submitted_at DESC
      `,
      [employee.id]
    )

    const requests = result.rows.map(mapTimeOffRequest)

    // Get allocations
    const currentYear = new Date().getFullYear()
    let allocation = await pool.query(
      `SELECT * FROM leave_allocations WHERE employee_id = $1 AND fiscal_year = $2`,
      [employee.id, currentYear]
    )

    if (allocation.rowCount === 0) {
      await pool.query(
        `
          INSERT INTO leave_allocations (employee_id, fiscal_year, vacation_days, sick_days, personal_days)
          VALUES ($1, $2, 20, 10, 3)
        `,
        [employee.id, currentYear]
      )

      allocation = await pool.query(
        `SELECT * FROM leave_allocations WHERE employee_id = $1 AND fiscal_year = $2`,
        [employee.id, currentYear]
      )
    }

    const alloc = allocation.rows[0]

    const stats = {
      paidTimeOffAvailable: alloc.vacation_days - alloc.vacation_used,
      sickTimeOffAvailable: alloc.sick_days - alloc.sick_used,
      unpaidDaysAvailable: "Unlimited",
    }

    res.json({ employee_id: id, requests, stats })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Leave: Tables missing, returning empty data")
      return res.json({ employee_id: id, requests: [], stats: { paidTimeOffAvailable: 0, sickTimeOffAvailable: 0, unpaidDaysAvailable: "Unlimited" } })
    }

    console.error("[v0] Leave: Error fetching employee requests", error)
    res.status(500).json({ detail: "Failed to fetch leave requests" })
  }
})

// POST /api/leave/approve/:id
router.post("/approve/:id", authenticateToken, requireHROrAdmin, async (req, res) => {
  const { id } = req.params
  const { approverId, notes } = req.body
  console.log(`[v0] Leave: Approving request ${id} by user ${req.user.email} (${req.user.role})`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensureTimeOffTables()

    // Get the leave request details before updating
    const requestData = await pool.query(
      `SELECT tor.*, e.user_id, u.first_name, u.last_name, u.email
       FROM time_off_requests tor
       JOIN employees e ON e.id = tor.employee_id
       JOIN users u ON u.id = e.user_id
       WHERE tor.id = $1`,
      [id]
    )

    if (requestData.rowCount === 0) {
      return res.status(404).json({ detail: "Leave request not found" })
    }

    const leaveRequest = requestData.rows[0]

    const result = await pool.query(
      `
        UPDATE time_off_requests
        SET status = 'approved', approval_notes = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [notes || null, approverId || null, id]
    )

    // Create notification for the employee who requested leave
    try {
      const employeeName = `${leaveRequest.first_name || ''} ${leaveRequest.last_name || ''}`.trim() || leaveRequest.email
      const leaveType = leaveRequest.request_type === 'vacation' ? 'paid' : leaveRequest.request_type
      const notificationMessage = `Your ${leaveType} leave request from ${new Date(leaveRequest.start_date).toLocaleDateString()} to ${new Date(leaveRequest.end_date).toLocaleDateString()} has been approved${notes ? ': ' + notes : ''}`

      await pool.query(
        `INSERT INTO notifications (user_id, type, message, reference_id, reference_type)
         VALUES ($1, 'leave', $2, $3, 'leave_request')`,
        [leaveRequest.user_id, notificationMessage, id]
      )

      console.log(`[v0] Leave: Created approval notification for user ${leaveRequest.user_id}`)
    } catch (notifError) {
      console.error("[v0] Leave: Error creating approval notification", notifError)
    }

    res.json({ message: "Leave request approved successfully" })
  } catch (error) {
    console.error("[v0] Leave: Error approving request", error)
    res.status(500).json({ detail: "Failed to approve leave request" })
  }
})

// POST /api/leave/reject/:id
router.post("/reject/:id", authenticateToken, requireHROrAdmin, async (req, res) => {
  const { id } = req.params
  const { approverId, notes } = req.body
  console.log(`[v0] Leave: Rejecting request ${id} by user ${req.user.email} (${req.user.role})`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensureTimeOffTables()

    // Get the leave request details before updating
    const requestData = await pool.query(
      `SELECT tor.*, e.user_id, u.first_name, u.last_name, u.email
       FROM time_off_requests tor
       JOIN employees e ON e.id = tor.employee_id
       JOIN users u ON u.id = e.user_id
       WHERE tor.id = $1`,
      [id]
    )

    if (requestData.rowCount === 0) {
      return res.status(404).json({ detail: "Leave request not found" })
    }

    const leaveRequest = requestData.rows[0]

    const result = await pool.query(
      `
        UPDATE time_off_requests
        SET status = 'rejected', approval_notes = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [notes || null, approverId || null, id]
    )

    // Create notification for the employee who requested leave
    try {
      const employeeName = `${leaveRequest.first_name || ''} ${leaveRequest.last_name || ''}`.trim() || leaveRequest.email
      const leaveType = leaveRequest.request_type === 'vacation' ? 'paid' : leaveRequest.request_type
      const notificationMessage = `Your ${leaveType} leave request from ${new Date(leaveRequest.start_date).toLocaleDateString()} to ${new Date(leaveRequest.end_date).toLocaleDateString()} has been rejected${notes ? ': ' + notes : ''}`

      await pool.query(
        `INSERT INTO notifications (user_id, type, message, reference_id, reference_type)
         VALUES ($1, 'leave', $2, $3, 'leave_request')`,
        [leaveRequest.user_id, notificationMessage, id]
      )

      console.log(`[v0] Leave: Created rejection notification for user ${leaveRequest.user_id}`)
    } catch (notifError) {
      console.error("[v0] Leave: Error creating rejection notification", notifError)
    }

    res.json({ message: "Leave request rejected successfully" })
  } catch (error) {
    console.error("[v0] Leave: Error rejecting request", error)
    res.status(500).json({ detail: "Failed to reject leave request" })
  }
})

// DELETE /api/leave/request/:id
router.delete("/request/:id", async (req, res) => {
  const { id } = req.params
  console.log(`[v0] Leave: Deleting request ${id}`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensureTimeOffTables()

    const result = await pool.query(
      `DELETE FROM time_off_requests WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Leave request not found" })
    }

    res.json({ message: "Leave request deleted successfully" })
  } catch (error) {
    console.error("[v0] Leave: Error deleting request", error)
    res.status(500).json({ detail: "Failed to delete leave request" })
  }
})

export default router


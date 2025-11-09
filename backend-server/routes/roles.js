import express from "express"
import pool from "../config/database.js"

const router = express.Router()

const VALID_ROLES = ["employee", "hr_officer", "payroll_officer", "admin"]

/**
 * GET /api/roles/employees
 * Get all employees with their roles (for admin to manage)
 */
router.get("/employees", async (req, res) => {
  console.log("[v0] Roles: Fetching all employees with roles")

  try {
    const result = await pool.query(
      `
        SELECT 
          e.id,
          e.employee_id,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.is_active,
          e.designation,
          e.date_of_joining,
          u.company_id
        FROM employees e
        JOIN users u ON u.id = e.user_id
        ORDER BY u.role DESC, e.created_at DESC
      `
    )

    const employees = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      userId: row.user_id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      designation: row.designation,
      dateOfJoining: row.date_of_joining,
      companyId: row.company_id
    }))

    res.json({ employees })
  } catch (error) {
    console.error("[v0] Roles: Error fetching employees", error)
    res.status(500).json({ detail: "Failed to fetch employees" })
  }
})

/**
 * PUT /api/roles/employees/:employee_id/role
 * Update an employee's role (admin only)
 */
router.put("/employees/:employee_id/role", async (req, res) => {
  const { employee_id } = req.params
  const { role, adminId } = req.body

  console.log(`[v0] Roles: Updating role for employee ${employee_id} to ${role}`)

  // Validate role
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ 
      detail: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` 
    })
  }

  try {
    // Get employee's user_id
    const employeeResult = await pool.query(
      `SELECT e.user_id, e.id, u.first_name, u.last_name, u.email, u.role as current_role
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.employee_id = $1 OR e.id::text = $1
       LIMIT 1`,
      [employee_id]
    )

    if (employeeResult.rowCount === 0) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const employee = employeeResult.rows[0]
    const userId = employee.user_id

    // Prevent removing the last admin
    if (employee.current_role === 'admin' && role !== 'admin') {
      const adminCount = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true`
      )

      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ 
          detail: "Cannot change role. At least one admin must remain in the system." 
        })
      }
    }

    // Update the role
    const result = await pool.query(
      `UPDATE users 
       SET role = $1, updated_at = NOW() 
       WHERE id = $2
       RETURNING id, email, role`,
      [role, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "User not found" })
    }

    // Create notification for the employee
    try {
      const roleName = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      const notificationMessage = `Your role has been updated to ${roleName}`

      await pool.query(
        `INSERT INTO notifications (user_id, type, message, reference_type)
         VALUES ($1, 'info', $2, 'role_change')`,
        [userId, notificationMessage]
      )

      console.log(`[v0] Roles: Created notification for user ${userId}`)
    } catch (notifError) {
      console.error("[v0] Roles: Error creating notification", notifError)
      // Don't fail the request if notification fails
    }

    const updated = result.rows[0]
    const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()

    res.json({ 
      message: `Role updated successfully for ${employeeName}`,
      employee: {
        employeeId: employee_id,
        userId: updated.id,
        email: updated.email,
        role: updated.role,
        name: employeeName
      }
    })
  } catch (error) {
    console.error(`[v0] Roles: Error updating role for ${employee_id}`, error)
    res.status(500).json({ detail: "Failed to update role" })
  }
})

/**
 * PUT /api/roles/employees/:employee_id/status
 * Activate or deactivate an employee (admin only)
 */
router.put("/employees/:employee_id/status", async (req, res) => {
  const { employee_id } = req.params
  const { isActive } = req.body

  console.log(`[v0] Roles: Updating status for employee ${employee_id} to ${isActive}`)

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ detail: "isActive must be a boolean value" })
  }

  try {
    // Get employee's user_id
    const employeeResult = await pool.query(
      `SELECT e.user_id, u.first_name, u.last_name, u.role
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE e.employee_id = $1 OR e.id::text = $1
       LIMIT 1`,
      [employee_id]
    )

    if (employeeResult.rowCount === 0) {
      return res.status(404).json({ detail: "Employee not found" })
    }

    const employee = employeeResult.rows[0]
    const userId = employee.user_id

    // Prevent deactivating the last admin
    if (employee.role === 'admin' && !isActive) {
      const activeAdminCount = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true`
      )

      if (parseInt(activeAdminCount.rows[0].count) <= 1) {
        return res.status(400).json({ 
          detail: "Cannot deactivate the last admin. At least one admin must remain active." 
        })
      }
    }

    // Update the status
    const result = await pool.query(
      `UPDATE users 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2
       RETURNING id, email, is_active`,
      [isActive, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "User not found" })
    }

    const updated = result.rows[0]
    const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()

    res.json({ 
      message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
      employee: {
        employeeId: employee_id,
        userId: updated.id,
        email: updated.email,
        isActive: updated.is_active,
        name: employeeName
      }
    })
  } catch (error) {
    console.error(`[v0] Roles: Error updating status for ${employee_id}`, error)
    res.status(500).json({ detail: "Failed to update employee status" })
  }
})

/**
 * GET /api/roles/available
 * Get list of available roles
 */
router.get("/available", async (req, res) => {
  res.json({ 
    roles: VALID_ROLES.map(role => ({
      value: role,
      label: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }))
  })
})

export default router

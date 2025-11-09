import express from "express"
import pool from "../config/database.js"
import { authenticateToken, requirePayrollOrAdmin, requireHRPayrollOrAdmin, requireAdmin } from "../middleware/auth.js"

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

  // Check if table exists and has correct schema
  try {
    const tableCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payroll_records'
    `)
    
    // If table exists but missing employee_uuid column, drop and recreate
    if (tableCheck.rowCount > 0) {
      const hasEmployeeUuid = tableCheck.rows.some(row => row.column_name === 'employee_uuid')
      if (!hasEmployeeUuid) {
        console.log('[v0] Payroll: Old schema detected, recreating table...')
        await db.query('DROP TABLE IF EXISTS payroll_records CASCADE')
      }
    }
  } catch (error) {
    console.warn('[v0] Payroll: Error checking table schema:', error.message)
  }

  // Create payruns table (admin only)
  await db.query(`
    CREATE TABLE IF NOT EXISTS payruns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payrun_name VARCHAR(200) NOT NULL,
      cycle_start_date DATE NOT NULL,
      cycle_end_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'draft',
      total_employees INT DEFAULT 0,
      total_amount NUMERIC(12, 2) DEFAULT 0,
      company_id UUID,
      created_by UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      submitted_at TIMESTAMP,
      approved_at TIMESTAMP,
      UNIQUE(company_id, cycle_start_date, cycle_end_date)
    );
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS payroll_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payrun_id UUID,
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
      FOREIGN KEY (payrun_id) REFERENCES payruns(id) ON DELETE CASCADE,
      UNIQUE(employee_uuid, year, month)
    );
  `)

  // Add missing columns if table already exists (migration)
  try {
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='payroll_records' AND column_name='employee_name') THEN
          ALTER TABLE payroll_records ADD COLUMN employee_name VARCHAR(150) NOT NULL DEFAULT 'Unknown';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='payroll_records' AND column_name='month_label') THEN
          ALTER TABLE payroll_records ADD COLUMN month_label VARCHAR(20) NOT NULL DEFAULT 'January';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='payroll_records' AND column_name='company_id') THEN
          ALTER TABLE payroll_records ADD COLUMN company_id UUID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='payroll_records' AND column_name='payrun_id') THEN
          ALTER TABLE payroll_records ADD COLUMN payrun_id UUID;
        END IF;
      END $$;
    `)
  } catch (error) {
    console.warn('[v0] Payroll: Error adding missing columns (may be normal):', error.message)
  }
  
  // Ensure salary_structures table has detailed breakdown columns
  await db.query(`
    CREATE TABLE IF NOT EXISTS salary_structures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL UNIQUE,
      basic_salary NUMERIC(12, 2) DEFAULT 0,
      hra NUMERIC(12, 2) DEFAULT 0,
      transport_allowance NUMERIC(12, 2) DEFAULT 0,
      medical_allowance NUMERIC(12, 2) DEFAULT 0,
      special_allowance NUMERIC(12, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `)
  
  // Add missing columns to existing salary_structures table
  try {
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='salary_structures' AND column_name='hra') THEN
          ALTER TABLE salary_structures ADD COLUMN hra NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='salary_structures' AND column_name='transport_allowance') THEN
          ALTER TABLE salary_structures ADD COLUMN transport_allowance NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='salary_structures' AND column_name='medical_allowance') THEN
          ALTER TABLE salary_structures ADD COLUMN medical_allowance NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='salary_structures' AND column_name='special_allowance') THEN
          ALTER TABLE salary_structures ADD COLUMN special_allowance NUMERIC(12, 2) DEFAULT 0;
        END IF;
      END $$;
    `)
    console.log('[v0] Payroll: Salary structures schema updated')
  } catch (error) {
    console.warn('[v0] Payroll: Error updating salary_structures schema:', error.message)
  }
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

router.get("/records", authenticateToken, requireHRPayrollOrAdmin, async (req, res) => {
  console.log(`[v0] Payroll: Fetching payroll records by user ${req.user.email} (${req.user.role})`)

  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensurePayrollTables()

    // Get company_id from authenticated user
    const companyId = req.user.company_id

    let query = `
      SELECT pr.*
      FROM payroll_records pr
    `
    let params = []

    // Filter by company if company_id exists
    if (companyId) {
      query += ` WHERE pr.company_id = $1`
      params.push(companyId)
    }

    query += ` ORDER BY pr.year DESC, pr.month DESC, pr.employee_name ASC`

    const result = await pool.query(query, params)

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

// Helper function to calculate payroll
function calculatePayroll(salaryStructure, attendance) {
  const basicSalary = Number(salaryStructure.basic_salary || 0)
  const hra = Number(salaryStructure.hra || basicSalary * 0.40) // 40% of basic
  const transportAllowance = Number(salaryStructure.transport_allowance || 1600)
  const medicalAllowance = Number(salaryStructure.medical_allowance || 1250)
  const specialAllowance = Number(salaryStructure.special_allowance || basicSalary * 0.15)
  
  const grossSalary = basicSalary + hra + transportAllowance + medicalAllowance + specialAllowance
  
  // Calculate working days salary
  const totalWorkingDays = attendance.total_working_days || 22
  const presentDays = attendance.present_days || totalWorkingDays
  const absentDays = totalWorkingDays - presentDays
  const perDaySalary = grossSalary / totalWorkingDays
  
  // Loss of pay for absents
  const lossOfPay = perDaySalary * absentDays
  
  // Calculate deductions
  const providentFund = basicSalary * 0.12 // 12% of basic salary
  const professionalTax = grossSalary > 15000 ? 200 : 0
  const incomeTax = calculateIncomeTax(grossSalary * 12) / 12 // Monthly TDS
  
  const totalDeductions = providentFund + professionalTax + incomeTax + lossOfPay
  const netSalary = grossSalary - totalDeductions
  
  return {
    basicSalary,
    hra,
    transportAllowance,
    medicalAllowance,
    specialAllowance,
    grossSalary,
    providentFund,
    professionalTax,
    incomeTax,
    lossOfPay,
    totalDeductions,
    netSalary,
    totalWorkingDays,
    presentDays,
    absentDays,
    perDaySalary
  }
}

// Simple income tax calculation (Indian tax slabs)
function calculateIncomeTax(annualIncome) {
  if (annualIncome <= 250000) return 0
  if (annualIncome <= 500000) return (annualIncome - 250000) * 0.05
  if (annualIncome <= 1000000) return 12500 + (annualIncome - 500000) * 0.20
  return 112500 + (annualIncome - 1000000) * 0.30
}

router.post("/runs", authenticateToken, requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  const { cycle_start_date, cycle_end_date, payrun_name } = req.body
  const companyId = req.user?.companyId
  const userId = req.user?.id

  if (!cycle_start_date || !cycle_end_date) {
    return res.status(400).json({ 
      error: 'cycle_start_date and cycle_end_date are required' 
    })
  }

  const startDate = new Date(cycle_start_date)
  const endDate = new Date(cycle_end_date)

  if (startDate >= endDate) {
    return res.status(400).json({ 
      error: 'cycle_end_date must be after cycle_start_date' 
    })
  }

  // Extract month and year from start date for naming
  const month = startDate.getMonth() + 1
  const year = startDate.getFullYear()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  const monthLabel = monthNames[month - 1]

  console.log(`[v0] Payroll: Creating payrun for ${cycle_start_date} to ${cycle_end_date} by user ${req.user.email} (${req.user.role})`)

  try {
    await ensurePayrollTables()

    // Create payrun record only (no payroll generation)
    const payrunResult = await pool.query(`
      INSERT INTO payruns (
        payrun_name, cycle_start_date, cycle_end_date, 
        company_id, created_by, status,
        total_employees, total_amount
      ) VALUES ($1, $2, $3, $4, $5, 'draft', 0, 0)
      RETURNING *
    `, [
      payrun_name || `Payrun ${monthLabel} ${year}`,
      cycle_start_date,
      cycle_end_date,
      companyId,
      userId
    ])

    const payrun = payrunResult.rows[0]
    console.log('[v0] Created payrun:', payrun.id)

    res.json({
      message: "Payrun created successfully",
      payrun: payrun
    })

  } catch (error) {
    console.error("[v0] Payroll: Failed to create payrun", error)
    res.status(500).json({ detail: "Failed to create payrun", error: error.message })
  }
})

router.get("/runs", authenticateToken, requireHRPayrollOrAdmin, async (req, res) => {
  console.log(`[v0] Payroll: Fetching payruns by user ${req.user.email} (${req.user.role})`)
  
  if (!requireDatabase(res)) {
    return
  }

  try {
    await ensurePayrollTables()

    const companyId = req.user.companyId

    let query = `
      SELECT 
        id,
        payrun_name,
        cycle_start_date,
        cycle_end_date,
        status,
        total_employees,
        total_amount,
        created_at,
        submitted_at,
        approved_at
      FROM payruns
    `
    let params = []

    if (companyId) {
      query += ` WHERE company_id = $1`
      params.push(companyId)
    }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    // Get company-wide stats for summary cards
    let employeeCountQuery = `
      SELECT COUNT(DISTINCT e.id) as total_employees
      FROM employees e
      JOIN users u ON u.id = e.user_id
      WHERE u.is_active = true
    `
    let salaryQuery = `
      SELECT COALESCE(SUM(
        COALESCE(basic_salary, 0) + 
        COALESCE(hra, 0) + 
        COALESCE(transport_allowance, 0) + 
        COALESCE(medical_allowance, 0) + 
        COALESCE(special_allowance, 0)
      ), 0) as total_salary
      FROM salary_structures ss
      JOIN employees e ON e.id = ss.employee_id
      JOIN users u ON u.id = e.user_id
      WHERE u.is_active = true
    `
    
    let statsParams = []
    if (companyId) {
      employeeCountQuery += ` AND u.company_id = $1`
      salaryQuery += ` AND u.company_id = $1`
      statsParams.push(companyId)
    }

    const [employeeCount, totalSalary] = await Promise.all([
      pool.query(employeeCountQuery, statsParams),
      pool.query(salaryQuery, statsParams)
    ])

    const stats = {
      totalEmployees: parseInt(employeeCount.rows[0]?.total_employees || '0'),
      totalSalary: parseFloat(totalSalary.rows[0]?.total_salary || '0'),
      processedPayruns: result.rows.filter(r => r.status === 'processed').length,
      draftPayruns: result.rows.filter(r => r.status === 'draft').length
    }

    res.json({ payruns: result.rows, stats })
  } catch (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn("[v0] Payroll: payruns table missing")
      return res.json({ payruns: [], stats: { totalEmployees: 0, totalSalary: 0, processedPayruns: 0, draftPayruns: 0 } })
    }

    console.error("[v0] Payroll: Failed to fetch payrun summaries", error)
    res.status(500).json({ detail: "Failed to fetch payruns" })
  }
})

router.put("/records/:id", authenticateToken, requireHRPayrollOrAdmin, async (req, res) => {
  console.log(`[v0] Payroll: Updating record ${req.params.id} by user ${req.user.email} (${req.user.role})`)
  
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

router.delete("/records/:id", authenticateToken, requireHRPayrollOrAdmin, async (req, res) => {
  console.log(`[v0] Payroll: Deleting record ${req.params.id} by user ${req.user.email} (${req.user.role})`)
  
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

router.get("/:employee_id/payslips", authenticateToken, async (req, res) => {
  if (!requireDatabase(res)) {
    return
  }

  const { employee_id } = req.params
  console.log(`[v0] Payroll: Fetching payslips for employee ${employee_id} by user ${req.user.email} (${req.user.role})`)

  try {
    const employeeLookup = await pool.query(
      `
        SELECT e.id, u.id as user_id
        FROM employees e
        JOIN users u ON u.id = e.user_id
        WHERE e.employee_id = $1 OR e.id::text = $1
        LIMIT 1
      `,
      [employee_id]
    )

    if (employeeLookup.rowCount === 0) {
      return res.json({ employee_id, payslips: [] })
    }

    const employeeUuid = employeeLookup.rows[0].id
    const employeeUserId = employeeLookup.rows[0].user_id
    
    // Users can view their own payslips (including HR officers and employees)
    // Payroll officers and admins can view all payslips
    const isOwnPayslip = req.user.id === employeeUserId
    const canViewAllPayslips = req.user.role === 'payroll_officer' || req.user.role === 'admin'
    
    if (!isOwnPayslip && !canViewAllPayslips) {
      return res.status(403).json({ 
        detail: "You can only view your own payslips. Payroll officers and admins can view all payslips." 
      })
    }
    
    const result = await pool.query(
      `
        SELECT 
          id,
          employee_id,
          employee_code,
          employee_name,
          email,
          month,
          month_label,
          year,
          
          -- Earnings breakdown
          basic_salary,
          hra,
          transport_allowance,
          medical_allowance,
          special_allowance,
          gross_salary,
          
          -- Deductions breakdown
          provident_fund,
          professional_tax,
          income_tax,
          loss_of_pay,
          total_deductions,
          
          -- Net Pay
          net_salary,
          
          -- Attendance
          total_working_days,
          present_days,
          absent_days,
          
          status,
          payroll_record_id,
          created_at,
          updated_at
        FROM payslips
        WHERE employee_id = $1 AND company_id = $2
        ORDER BY year DESC, month DESC, created_at DESC
      `,
      [employeeUuid, req.user.company_id]
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

// Route to approve/finalize payroll and generate payslips
router.post("/approve/:payroll_id", authenticateToken, requireHRPayrollOrAdmin, async (req, res) => {
  console.log(`[v0] Payroll: Approving payroll ${req.params.payroll_id} by user ${req.user.email} (${req.user.role})`)
  
  if (!requireDatabase(res)) {
    return
  }

  const { payroll_id } = req.params
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Get payroll record
    const payrollRecord = await client.query(
      `SELECT * FROM payroll_records WHERE id = $1`,
      [payroll_id]
    )

    if (payrollRecord.rowCount === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ detail: "Payroll record not found" })
    }

    const record = payrollRecord.rows[0]

    // Get employee details with salary structure
    const employeeData = await client.query(
      `
        SELECT 
          e.id, e.employee_id, e.user_id,
          u.first_name, u.last_name, u.email,
          ss.basic_salary, ss.hra, ss.transport_allowance,
          ss.medical_allowance, ss.special_allowance
        FROM employees e
        JOIN users u ON u.id = e.user_id
        LEFT JOIN salary_structures ss ON ss.employee_id = e.id
        WHERE e.id = $1
      `,
      [record.employee_uuid]
    )

    if (employeeData.rowCount === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ detail: "Employee not found" })
    }

    const employee = employeeData.rows[0]

    // Calculate detailed payroll
    const payrollCalc = calculatePayroll(employee, {
      total_working_days: record.total_working_days,
      present_days: record.payable_days,
      absent_days: record.unpaid_leaves
    })

    // Create detailed payslip
    const payslipData = {
      employee_id: employee.id,
      employee_code: employee.employee_id,
      employee_name: `${employee.first_name} ${employee.last_name}`.trim(),
      email: employee.email,
      month: record.month,
      month_label: record.month_label,
      year: record.year,
      
      // Earnings
      basic_salary: payrollCalc.basicSalary,
      hra: payrollCalc.hra,
      transport_allowance: payrollCalc.transportAllowance,
      medical_allowance: payrollCalc.medicalAllowance,
      special_allowance: payrollCalc.specialAllowance,
      gross_salary: payrollCalc.grossSalary,
      
      // Deductions
      provident_fund: payrollCalc.providentFund,
      professional_tax: payrollCalc.professionalTax,
      income_tax: payrollCalc.incomeTax,
      loss_of_pay: payrollCalc.lossOfPay,
      total_deductions: payrollCalc.totalDeductions,
      
      // Net Pay
      net_salary: payrollCalc.netSalary,
      
      // Attendance
      total_working_days: payrollCalc.totalWorkingDays,
      present_days: payrollCalc.presentDays,
      absent_days: payrollCalc.absentDays,
      
      payroll_record_id: payroll_id,
      status: 'approved',
      generated_by: req.user.id,
      company_id: req.user.company_id
    }

    // Ensure payslips table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL,
        employee_code VARCHAR(50) NOT NULL,
        employee_name VARCHAR(150) NOT NULL,
        email VARCHAR(255),
        month INT NOT NULL,
        month_label VARCHAR(20) NOT NULL,
        year INT NOT NULL,
        
        basic_salary NUMERIC(12, 2) DEFAULT 0,
        hra NUMERIC(12, 2) DEFAULT 0,
        transport_allowance NUMERIC(12, 2) DEFAULT 0,
        medical_allowance NUMERIC(12, 2) DEFAULT 0,
        special_allowance NUMERIC(12, 2) DEFAULT 0,
        gross_salary NUMERIC(12, 2) DEFAULT 0,
        
        provident_fund NUMERIC(12, 2) DEFAULT 0,
        professional_tax NUMERIC(12, 2) DEFAULT 0,
        income_tax NUMERIC(12, 2) DEFAULT 0,
        loss_of_pay NUMERIC(12, 2) DEFAULT 0,
        total_deductions NUMERIC(12, 2) DEFAULT 0,
        
        net_salary NUMERIC(12, 2) DEFAULT 0,
        
        total_working_days INT DEFAULT 0,
        present_days NUMERIC(5, 1) DEFAULT 0,
        absent_days NUMERIC(5, 1) DEFAULT 0,
        
        payroll_record_id UUID,
        status VARCHAR(20) DEFAULT 'draft',
        generated_by UUID,
        company_id UUID,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(employee_id, year, month)
      );
    `)

    // Insert or update payslip
    const payslip = await client.query(
      `
        INSERT INTO payslips (
          employee_id, employee_code, employee_name, email,
          month, month_label, year,
          basic_salary, hra, transport_allowance, medical_allowance, special_allowance, gross_salary,
          provident_fund, professional_tax, income_tax, loss_of_pay, total_deductions,
          net_salary,
          total_working_days, present_days, absent_days,
          payroll_record_id, status, generated_by, company_id,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW()
        )
        ON CONFLICT (employee_id, year, month)
        DO UPDATE SET
          employee_code = EXCLUDED.employee_code,
          employee_name = EXCLUDED.employee_name,
          email = EXCLUDED.email,
          month_label = EXCLUDED.month_label,
          basic_salary = EXCLUDED.basic_salary,
          hra = EXCLUDED.hra,
          transport_allowance = EXCLUDED.transport_allowance,
          medical_allowance = EXCLUDED.medical_allowance,
          special_allowance = EXCLUDED.special_allowance,
          gross_salary = EXCLUDED.gross_salary,
          provident_fund = EXCLUDED.provident_fund,
          professional_tax = EXCLUDED.professional_tax,
          income_tax = EXCLUDED.income_tax,
          loss_of_pay = EXCLUDED.loss_of_pay,
          total_deductions = EXCLUDED.total_deductions,
          net_salary = EXCLUDED.net_salary,
          total_working_days = EXCLUDED.total_working_days,
          present_days = EXCLUDED.present_days,
          absent_days = EXCLUDED.absent_days,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING *
      `,
      [
        payslipData.employee_id, payslipData.employee_code, payslipData.employee_name, payslipData.email,
        payslipData.month, payslipData.month_label, payslipData.year,
        payslipData.basic_salary, payslipData.hra, payslipData.transport_allowance, 
        payslipData.medical_allowance, payslipData.special_allowance, payslipData.gross_salary,
        payslipData.provident_fund, payslipData.professional_tax, payslipData.income_tax,
        payslipData.loss_of_pay, payslipData.total_deductions,
        payslipData.net_salary,
        payslipData.total_working_days, payslipData.present_days, payslipData.absent_days,
        payslipData.payroll_record_id, payslipData.status, payslipData.generated_by, payslipData.company_id
      ]
    )

    // Update payroll record status
    await client.query(
      `UPDATE payroll_records SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [payroll_id]
    )

    await client.query("COMMIT")

    res.json({ 
      message: "Payroll approved and payslip generated successfully", 
      payslip: payslip.rows[0],
      payrollRecord: { ...record, status: 'approved' }
    })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error(`[v0] Payroll: Error approving payroll ${payroll_id}`, error)
    res.status(500).json({ detail: "Failed to approve payroll", error: error.message })
  } finally {
    client.release()
  }
})

export default router

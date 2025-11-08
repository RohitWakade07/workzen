import express from "express";
import pool from "../config/database.js";

const router = express.Router();

/**
 * ✅ GET /api/payroll/records
 * Fetch all payroll records
 */
router.get("/records", async (req, res) => {
  console.log("[v0] Fetching payroll records");
  try {
    const result = await pool.query(
      "SELECT * FROM payroll_records ORDER BY id DESC;"
    );
    res.json({ records: result.rows });
  } catch (error) {
    console.error("[v0] Error fetching payroll records:", error.message);
    res.status(500).json({ detail: "Failed to fetch payroll records" });
  }
});

/**
 * ✅ GET /api/payroll/runs
 * Fetch all payroll runs
 */
router.get("/runs", async (req, res) => {
  console.log("[v0] Fetching payrun list");
  try {
    const result = await pool.query("SELECT * FROM payroll_runs ORDER BY year DESC, month DESC;");
    res.json({ payruns: result.rows });
  } catch (error) {
    console.error("[v0] Error fetching payruns:", error.message);
    res.status(500).json({ detail: "Failed to fetch payruns" });
  }
});

/**
 * ✅ POST /api/payroll/runs
 * Create a new payrun
 */
router.post("/runs", async (req, res) => {
  const { month, year, total, employees } = req.body;
  console.log(`[v0] Creating payrun for ${month} ${year}`);

  try {
    const result = await pool.query(
      `
      INSERT INTO payroll_runs (month, year, status, total, employees)
      VALUES ($1, $2, 'draft', $3, $4)
      RETURNING *;
      `,
      [month, year, total || 0, employees || 0]
    );

    res.json({
      id: result.rows[0].id,
      status: result.rows[0].status,
      message: "Payrun created successfully",
    });
  } catch (error) {
    console.error("[v0] Error creating payrun:", error.message);
    res.status(500).json({ detail: "Failed to create payrun" });
  }
});

/**
 * ✅ POST /api/payroll/approve/:payrun_id
 * Approve a payrun
 */
router.post("/approve/:payrun_id", async (req, res) => {
  const { payrun_id } = req.params;
  const { approved_by } = req.body;
  console.log(`[v0] Approving payrun: ${payrun_id}`);

  try {
    const result = await pool.query(
      `
      UPDATE payroll_runs 
      SET status = 'approved', approved_by = $1, approved_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [approved_by, payrun_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Payrun not found" });
    }

    res.json({
      id: result.rows[0].id,
      status: result.rows[0].status,
      message: "Payrun approved successfully",
    });
  } catch (error) {
    console.error("[v0] Error approving payrun:", error.message);
    res.status(500).json({ detail: "Failed to approve payrun" });
  }
});

/**
 * ✅ GET /api/payroll/:employee_id/payslips
 * Fetch all payslips for an employee
 */
router.get("/:employee_id/payslips", async (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching payslips for employee: ${employee_id}`);

  try {
    const result = await pool.query(
      "SELECT * FROM payslips WHERE employee_id = $1 ORDER BY generated_at DESC;",
      [employee_id]
    );

    res.json({ employee_id, payslips: result.rows });
  } catch (error) {
    console.error(`[v0] Error fetching payslips for ${employee_id}:`, error.message);
    res.status(500).json({ detail: "Failed to fetch payslips" });
  }
});

/**
 * ✅ POST /api/payroll/:employee_id/payslips
 * Generate a new payslip for an employee
 */
router.post("/:employee_id/payslips", async (req, res) => {
  const { employee_id } = req.params;
  const { month, year, net_salary, payable_days, unpaid_leaves } = req.body;
  console.log(`[v0] Generating payslip for employee: ${employee_id}`);

  try {
    const result = await pool.query(
      `
      INSERT INTO payslips (employee_id, month, year, net_salary, payable_days, unpaid_leaves)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
      `,
      [employee_id, month, year, net_salary, payable_days, unpaid_leaves]
    );

    res.json({
      message: "Payslip generated successfully",
      payslip: result.rows[0],
    });
  } catch (error) {
    console.error(`[v0] Error generating payslip for ${employee_id}:`, error.message);
    res.status(500).json({ detail: "Failed to generate payslip" });
  }
});

export default router;

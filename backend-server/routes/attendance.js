import express from "express";
import pool from "../config/database"; // Your PostgreSQL connection pool

const router = express.Router();

/**
 * POST /api/attendance/check-in
 * Marks check-in for an employee.
 */
router.post("/check-in", async (req, res) => {
  console.log("[v0] Check-in request received");
  const { employeeId, employeeName } = req.body;

  try {
    // Get today's date
    const date = new Date().toISOString().split("T")[0];
    const checkInTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Insert new record or update if exists
    const result = await pool.query(
      `
      INSERT INTO attendance (employee_id, employee_name, check_in_time, status, date)
      VALUES ($1, $2, $3, 'present', $4)
      ON CONFLICT (employee_id, date)
      DO UPDATE SET check_in_time = EXCLUDED.check_in_time, status = 'present'
      RETURNING *;
      `,
      [employeeId, employeeName, checkInTime, date]
    );

    res.json({ message: "Check-in recorded successfully", record: result.rows[0] });
  } catch (error) {
    console.error("Error during check-in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/attendance/check-out
 * Marks check-out for an employee and calculates work hours.
 */
router.post("/check-out", async (req, res) => {
  console.log("[v0] Check-out request received");
  const { employeeId } = req.body;

  try {
    const date = new Date().toISOString().split("T")[0];
    const checkOutTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Fetch check-in time
    const result = await pool.query(
      "SELECT check_in_time FROM attendance WHERE employee_id = $1 AND date = $2;",
      [employeeId, date]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Check-in record not found for today" });
    }

    const checkInTime = result.rows[0].check_in_time;
    const workHours = calculateWorkHours(checkInTime, checkOutTime);

    // Update check-out and work hours
    const update = await pool.query(
      `
      UPDATE attendance
      SET check_out_time = $1, work_hours = $2
      WHERE employee_id = $3 AND date = $4
      RETURNING *;
      `,
      [checkOutTime, workHours, employeeId, date]
    );

    res.json({ message: "Check-out recorded successfully", record: update.rows[0] });
  } catch (error) {
    console.error("Error during check-out:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/attendance/
 * Fetch all attendance records for today.
 */
router.get("/", async (req, res) => {
  console.log("[v0] Fetching all attendance records");
  try {
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query("SELECT * FROM attendance WHERE date = $1;", [today]);
    const records = result.rows;

    // Calculate daily stats
    const stats = {
      presentToday: records.filter(r => r.status === "present").length,
      absent: records.filter(r => r.status === "absent").length,
      onLeave: records.filter(r => r.status === "on_leave").length,
      halfDay: records.filter(r => r.status === "half_day").length,
    };

    res.json({ records, stats });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/attendance/:emp_id
 * Fetch all attendance records for a specific employee.
 */
router.get("/:emp_id", async (req, res) => {
  const { emp_id } = req.params;
  console.log(`[v0] Fetching attendance records for: ${emp_id}`);

  try {
    const result = await pool.query("SELECT * FROM attendance WHERE employee_id = $1;", [emp_id]);
    const records = result.rows;

    const stats = {
      totalDaysPresent: records.filter(r => r.status === "present").length,
      pendingApprovals: 0, // Placeholder for future workflow logic
      totalWorkHours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
    };

    res.json({ employee_id: emp_id, records, stats });
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Helper function — calculate work hours from check-in/check-out times.
 */
function calculateWorkHours(checkIn, checkOut) {
  try {
    const [inH, inM, inPeriod] = checkIn.split(/[: ]/);
    const [outH, outM, outPeriod] = checkOut.split(/[: ]/);

    let start =
      (inPeriod === "PM" && inH !== "12" ? +inH + 12 : +inH % 12) * 60 + +inM;
    let end =
      (outPeriod === "PM" && outH !== "12" ? +outH + 12 : +outH % 12) * 60 + +outM;

    const diff = Math.max(0, end - start);
    return +(diff / 60).toFixed(2);
  } catch {
    return 0;
  }
}

export default router;

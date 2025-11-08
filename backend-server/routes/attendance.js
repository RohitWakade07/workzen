import express from "express";

const router = express.Router();

// POST /api/attendance/check-in
router.post("/check-in", (req, res) => {
  console.log("[v0] Check-in request received");
  res.json({ message: "Check-in recorded successfully" });
});

// POST /api/attendance/check-out
router.post("/check-out", (req, res) => {
  console.log("[v0] Check-out request received");
  res.json({ message: "Check-out recorded successfully" });
});

// GET /api/attendance/:emp_id
router.get("/:emp_id", (req, res) => {
  const { emp_id } = req.params;
  console.log(`[v0] Fetching attendance records for: ${emp_id}`);
  res.json({ employee_id: emp_id, records: [] });
});

export default router;


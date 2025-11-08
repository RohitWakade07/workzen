import express from "express";

const router = express.Router();

// GET /api/payroll/runs
router.get("/runs", (req, res) => {
  console.log("[v0] Fetching payrun list");
  res.json({
    payruns: [
      {
        id: "pr_202411",
        month: "November",
        year: 2025,
        status: "submitted",
        employees: 156,
        total: 287500
      }
    ]
  });
});

// POST /api/payroll/runs
router.post("/runs", (req, res) => {
  const data = req.body;
  console.log(`[v0] Creating payrun for ${data.month} ${data.year}`);
  res.json({
    id: "pr_new",
    status: "draft",
    message: "Payrun created"
  });
});

// POST /api/payroll/approve/:payrun_id
router.post("/approve/:payrun_id", (req, res) => {
  const { payrun_id } = req.params;
  const data = req.body;
  console.log(`[v0] Approving payrun: ${payrun_id}`);
  console.log(`[v0] Approved by: ${data.approved_by}`);
  res.json({
    id: payrun_id,
    status: "approved",
    message: "Payrun approved successfully"
  });
});

// GET /api/payroll/:employee_id/payslips
router.get("/:employee_id/payslips", (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching payslips for employee: ${employee_id}`);
  res.json({
    employee_id: employee_id,
    payslips: []
  });
});

export default router;


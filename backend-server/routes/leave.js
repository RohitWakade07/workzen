import express from "express";

const router = express.Router();

// GET /api/leave/balance/:id
router.get("/balance/:id", (req, res) => {
  const { id } = req.params;
  console.log(`[v0] Fetching leave balance for: ${id}`);
  res.json({ employee_id: id, balance: 12 });
});

// POST /api/leave/request
router.post("/request", (req, res) => {
  console.log("[v0] Leave request submitted");
  res.json({ message: "Leave request submitted successfully" });
});

// GET /api/leave/requests/:id
router.get("/requests/:id", (req, res) => {
  const { id } = req.params;
  console.log(`[v0] Fetching leave requests for: ${id}`);
  res.json({ employee_id: id, requests: [] });
});

// POST /api/leave/approve/:id
router.post("/approve/:id", (req, res) => {
  const { id } = req.params;
  console.log(`[v0] Approving leave request: ${id}`);
  res.json({ message: "Leave request approved successfully" });
});

export default router;


import express from "express";

const router = express.Router();

// Mock leave data storage
const leaveRequests = [
  {
    id: "to_001",
    employeeId: "emp_001",
    employeeName: "John Doe",
    startDate: "2025-01-15",
    endDate: "2025-01-17",
    type: "paid",
    status: "approved",
    days: 3,
  },
  {
    id: "to_002",
    employeeId: "emp_002",
    employeeName: "Jane Smith",
    startDate: "2025-01-20",
    endDate: "2025-01-22",
    type: "sick",
    status: "pending",
    days: 3,
  },
  {
    id: "to_003",
    employeeId: "emp_003",
    employeeName: "Mike Chen",
    startDate: "2025-02-01",
    endDate: "2025-02-05",
    type: "paid",
    status: "approved",
    days: 5,
  },
];

// GET /api/leave/balance/:id
router.get("/balance/:id", (req, res) => {
  const { id } = req.params;
  console.log(`[v0] Fetching leave balance for: ${id}`);
  res.json({ employee_id: id, balance: 12 });
});

// POST /api/leave/request
router.post("/request", (req, res) => {
  console.log("[v0] Leave request submitted");
  const newRequest = {
    id: `to_${Date.now()}`,
    ...req.body,
    status: "pending",
  };
  leaveRequests.push(newRequest);
  res.json({ message: "Leave request submitted successfully", request: newRequest });
});

// GET /api/leave/requests - Get all leave requests (for admin/HR)
router.get("/requests", (req, res) => {
  console.log("[v0] Fetching all leave requests");
  const stats = {
    totalPaidTimeOff: 250,
    totalSickTimeOff: 160,
    pendingApprovals: leaveRequests.filter(r => r.status === "pending").length,
  };
  res.json({ requests: leaveRequests, stats });
});

// GET /api/leave/requests/:id - Get leave requests for specific employee
router.get("/requests/:id", (req, res) => {
  const { id } = req.params;
  console.log(`[v0] Fetching leave requests for: ${id}`);
  
  // Normalize employee ID
  const normalizedId = id.toLowerCase().replace(/^emp_/, "emp_");
  const employeeRequests = leaveRequests.filter(r => 
    r.employeeId === normalizedId || r.employeeId === id
  );
  
  const stats = {
    paidTimeOffAvailable: 12,
    sickTimeOffAvailable: 8,
    unpaidDaysAvailable: "Unlimited",
  };
  
  res.json({ employee_id: id, requests: employeeRequests, stats });
});

// POST /api/leave/approve/:id
router.post("/approve/:id", (req, res) => {
  const { id } = req.params;
  console.log(`[v0] Approving leave request: ${id}`);
  const request = leaveRequests.find(r => r.id === id);
  if (request) {
    request.status = "approved";
  }
  res.json({ message: "Leave request approved successfully" });
});

export default router;


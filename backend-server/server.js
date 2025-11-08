import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import attendanceRoutes from "./routes/attendance.js";
import leaveRoutes from "./routes/leave.js";
import payrollRoutes from "./routes/payroll.js";
import adminRoutes from "./routes/admin.js";
import { testConnection, getDatabaseInfo } from "./config/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[v0] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoints (before 404 handler)
app.get("/", (req, res) => {
  res.json({
    status: "operational",
    service: "WorkZen HRMS",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const dbInfo = await getDatabaseInfo();
    const connectionTest = await testConnection();
    
    res.json({
      status: "operational",
      database: dbInfo.connected ? "connected" : "disconnected",
      database_info: dbInfo.connected ? {
        version: dbInfo.version,
        database: dbInfo.database
      } : { error: dbInfo.error },
      connection_test: connectionTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: "operational",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler (must be after all routes, before error handler)
app.use((req, res, next) => {
  console.log(`[v0] 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    detail: `Route ${req.method} ${req.path} not found`
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error("[v0] Error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    detail: err.message || "Internal server error"
  });
});

app.listen(PORT, async () => {
  console.log(`[v0] WorkZen HRMS Backend Starting`);
  console.log(`[v0] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[v0] Server running on http://localhost:${PORT}`);
  
  // Test database connection on startup
  console.log(`[v0] Testing database connection...`);
  const dbTest = await testConnection();
  if (dbTest.connected) {
    console.log(`[v0] ✓ Database connection successful`);
  } else {
    console.log(`[v0] ✗ Database connection failed: ${dbTest.error}`);
    console.log(`[v0] Note: Backend will continue with in-memory storage`);
  }
});


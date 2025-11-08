import express from "express";
import crypto from "crypto";

const router = express.Router();

// Mock users database
const USERS_DB = {
  "admin@test.com": { password: "password", role: "admin", id: "admin_001", employeeId: "ADMIN001" },
  "hr@test.com": { password: "password", role: "hr_officer", id: "hr_001", employeeId: "HR001" },
  "payroll@test.com": { password: "password", role: "payroll_officer", id: "payroll_001", employeeId: "PAY001" },
  "employee@test.com": { password: "password", role: "employee", id: "emp_001", employeeId: "EMP001" },
  "john.doe@company.com": { password: "password", role: "employee", id: "emp_001", employeeId: "EMP001" },
  "jane.smith@company.com": { password: "password", role: "hr_officer", id: "hr_001", employeeId: "HR001" },
  "bob.wilson@company.com": { password: "password", role: "payroll_officer", id: "payroll_001", employeeId: "PAY001" },
  "admin@company.com": { password: "password", role: "admin", id: "admin_001", employeeId: "ADMIN001" }
};

const ACCESS_TOKEN_EXPIRE_MINUTES = 30;

// Generate token
function generateToken(email) {
  return crypto.createHash("sha256")
    .update(`${email}${Date.now()}`)
    .digest("hex");
}

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  console.log(`[v0] Login attempt for ${email}`);
  
  try {
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required" });
    }

    if (!USERS_DB[email]) {
      console.log(`[v0] Login failed - user not found: ${email}`);
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    const user = USERS_DB[email];
    if (user.password !== password) {
      console.log(`[v0] Login failed - invalid password for: ${email}`);
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    const token = generateToken(email);
    console.log(`[v0] Login successful for ${email} - role: ${user.role}`);

    res.json({
      access_token: token,
      token_type: "bearer",
      user_id: user.id,
      role: user.role,
      expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60
    });
  } catch (error) {
    console.error(`[v0] Login error: ${error.message}`);
    res.status(500).json({ detail: "Login failed" });
  }
});

// POST /api/auth/signup
router.post("/signup", (req, res) => {
  const { email, password, name, role } = req.body;
  
  console.log(`[v0] Signup attempt for ${email} with role ${role}`);
  
  try {
    if (!email || !password || !name) {
      return res.status(400).json({ detail: "Missing required fields" });
    }

    if (USERS_DB[email]) {
      console.log(`[v0] Signup failed - user already exists: ${email}`);
      return res.status(400).json({ detail: "User already exists" });
    }

    const validRoles = ["employee", "hr_officer", "payroll_officer", "admin"];
    if (role && !validRoles.includes(role)) {
      console.log(`[v0] Signup failed - invalid role: ${role}`);
      return res.status(400).json({
        detail: `Invalid role. Must be one of: ${validRoles.join(", ")}`
      });
    }

    const user_id = `user_${Date.now()}`;
    USERS_DB[email] = {
      password,
      role: role || "employee",
      id: user_id,
      employeeId: `EMP${Date.now().toString().slice(-3)}`
    };

    const token = generateToken(email);
    console.log(`[v0] Signup successful - new user created: ${email} with role ${role || "employee"}`);

    res.json({
      access_token: token,
      token_type: "bearer",
      user_id,
      role: role || "employee",
      expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60
    });
  } catch (error) {
    console.error(`[v0] Signup error: ${error.message}`);
    res.status(500).json({ detail: "Signup failed" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  console.log("[v0] User logout request received");
  res.json({ message: "Logged out successfully" });
});

// GET /api/auth/validate-token
router.get("/validate-token", (req, res) => {
  const { token } = req.query;
  console.log("[v0] Token validation requested");
  res.json({
    valid: true,
    expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60
  });
});

export default router;


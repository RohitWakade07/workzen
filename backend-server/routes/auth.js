import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database.js"; // your PostgreSQL connection pool

const router = express.Router();

const ACCESS_TOKEN_EXPIRE_MINUTES = 30;
const JWT_SECRET = "your_jwt_secret_key_here"; // store securely in .env file!

/**
 * ✅ Utility: Generate JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee_id,
    },
    JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
  );
}

/**
 * ✅ POST /api/auth/signup
 * Registers a new user.
 */
router.post("/signup", async (req, res) => {
  const { email, password, name, role } = req.body;
  console.log(`[v0] Signup attempt for ${email} with role ${role}`);

  try {
    if (!email || !password || !name) {
      return res.status(400).json({ detail: "Missing required fields" });
    }

    const validRoles = ["employee", "hr_officer", "payroll_officer", "admin"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        detail: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Check if email already exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rowCount > 0) {
      return res.status(400).json({ detail: "User already exists" });
    }

  // Hash password (bcryptjs sync)
  const hashedPassword = bcrypt.hashSync(password, 10);

    // Create new user
    const userResult = await pool.query(
      `
      INSERT INTO users (email, password, name, role, employee_id, status, created_date)
      VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE)
      RETURNING id, email, role, employee_id;
      `,
      [email, hashedPassword, name, role || "employee", `EMP${Date.now().toString().slice(-4)}`]
    );

    const user = userResult.rows[0];
    const token = generateAccessToken(user);

    console.log(`[v0] Signup successful - new user: ${email}`);

    res.json({
      access_token: token,
      token_type: "bearer",
      user_id: user.id,
      role: user.role,
      expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });
  } catch (error) {
    console.error("[v0] Signup error:", error.message);
    res.status(500).json({ detail: "Signup failed" });
  }
});

/**
 * ✅ POST /api/auth/login
 * Logs in an existing user.
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`[v0] Login attempt for ${email}`);

  try {
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rowCount === 0) {
      console.log(`[v0] Login failed - user not found: ${email}`);
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    const user = result.rows[0];
  // Compare password (bcryptjs sync)
  const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      console.log(`[v0] Login failed - invalid password for: ${email}`);
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    const token = generateAccessToken(user);
    console.log(`[v0] Login successful for ${email} - role: ${user.role}`);

    res.json({
      access_token: token,
      token_type: "bearer",
      user_id: user.id,
      role: user.role,
      expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });
  } catch (error) {
    console.error("[v0] Login error:", error.message);
    res.status(500).json({ detail: "Login failed" });
  }
});

/**
 * ✅ POST /api/auth/logout
 * Clears token (client-side handled)
 */
router.post("/logout", (req, res) => {
  console.log("[v0] User logout request received");
  res.json({ message: "Logged out successfully" });
});

/**
 * ✅ GET /api/auth/validate-token
 * Validates JWT token
 */
router.get("/validate-token", (req, res) => {
  const authHeader = req.headers.authorization;
  console.log("[v0] Token validation requested");

  if (!authHeader) {
    return res.status(401).json({ valid: false, detail: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      valid: true,
      user: decoded,
      expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });
  } catch (error) {
    res.status(401).json({ valid: false, detail: "Invalid or expired token" });
  }
});

export default router;

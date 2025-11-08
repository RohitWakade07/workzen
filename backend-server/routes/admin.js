import express from "express";
import pool from "./../config/database.js";

const router = express.Router();

// ✅ GET /api/admin/users — fetch all users
router.get("/users", async (req, res) => {
  console.log("[v0] Fetching users list");
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY created_date DESC");
    res.json({ users: result.rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ POST /api/admin/users — create new user
router.post("/users", async (req, res) => {
  console.log("[v0] Creating new user");
  try {
    const { email, name, role, department } = req.body;
    const status = "active";
    const lastLogin = new Date().toLocaleString();
    const createdDate = new Date().toISOString().split("T")[0];

    const query = `
      INSERT INTO users (email, name, role, status, department, last_login, created_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [email, name, role, status, department, lastLogin, createdDate];
    const result = await pool.query(query, values);

    res.json({ message: "User created successfully", user: result.rows[0] });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ DELETE /api/admin/users/:id — delete user by ID
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`[v0] Deleting user: ${id}`);
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *;", [id]);
    if (result.rowCount > 0) {
      res.json({ message: "User deleted successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ GET /api/admin/settings
router.get("/settings", async (req, res) => {
  console.log("[v0] Fetching system settings");
  try {
    const result = await pool.query("SELECT * FROM settings LIMIT 1;");
    res.json({ settings: result.rows[0] || {} });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ POST /api/admin/settings
router.post("/settings", async (req, res) => {
  console.log("[v0] Updating system settings");
  try {
    const { timezone, theme, notifications } = req.body;
    await pool.query(
      `
      UPDATE settings 
      SET timezone = $1, theme = $2, notifications = $3
      WHERE id = 1;
      `,
      [timezone, theme, notifications]
    );
    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ GET /api/admin/audit-logs
router.get("/audit-logs", async (req, res) => {
  console.log("[v0] Fetching audit logs");
  try {
    const result = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;");
    res.json({ logs: result.rows });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

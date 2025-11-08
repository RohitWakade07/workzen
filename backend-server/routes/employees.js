import express from "express";
import pool from "../config/database.js";

const router = express.Router();

/**
 * ✅ GET /api/employees/
 * Fetch all employees
 */
router.get("/", async (req, res) => {
  console.log("[v0] Fetching employee list");
  try {
    const result = await pool.query("SELECT * FROM employees ORDER BY id ASC");
    console.log(`[v0] Returning ${result.rowCount} employees`);
    res.json(result.rows);
  } catch (error) {
    console.error(`[v0] Error fetching employees: ${error.message}`);
    res.status(500).json({ detail: "Failed to fetch employees" });
  }
});

/**
 * ✅ GET /api/employees/:employee_id
 * Fetch details for a single employee
 */
router.get("/:employee_id", async (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching employee details for ${employee_id}`);

  try {
    const result = await pool.query(
      "SELECT * FROM employees WHERE employee_id = $1 OR id = $1",
      [employee_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ detail: "Employee not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`[v0] Error fetching employee ${employee_id}: ${error.message}`);
    res.status(500).json({ detail: "Failed to fetch employee" });
  }
});

/**
 * ✅ POST /api/employees/
 * Create a new employee
 */
router.post("/", async (req, res) => {
  const data = req.body;
  console.log(`[v0] Creating new employee with ID: ${data.employee_id}`);

  try {
    const requiredFields = ["employee_id", "first_name", "last_name", "email", "department"];
    const missing = requiredFields.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.status(400).json({ detail: `Missing required fields: ${missing.join(", ")}` });
    }

    const result = await pool.query(
      `
      INSERT INTO employees 
        (employee_id, first_name, last_name, email, department, position, status, phone, date_of_joining, salary)
      VALUES 
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
      `,
      [
        data.employee_id,
        data.first_name,
        data.last_name,
        data.email,
        data.department,
        data.position || "Employee",
        data.status || "active",
        data.phone || null,
        data.date_of_joining || new Date().toISOString().split("T")[0],
        data.salary || 0,
      ]
    );

    res.json({ message: "Employee created successfully", employee: result.rows[0] });
  } catch (error) {
    console.error(`[v0] Error creating employee: ${error.message}`);
    res.status(500).json({ detail: "Failed to create employee" });
  }
});

/**
 * ✅ GET /api/employees/:employee_id/profile
 * Fetch profile details for an employee
 */
router.get("/:employee_id/profile", async (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching profile for employee: ${employee_id}`);

  try {
    const result = await pool.query(
      `
      SELECT p.*, e.first_name, e.last_name, e.email, e.department, e.position, e.phone, e.date_of_joining
      FROM employee_profiles p
      JOIN employees e ON e.employee_id = p.employee_id
      WHERE p.employee_id = $1;
      `,
      [employee_id]
    );

    if (result.rowCount === 0) {
      // fallback — employee exists but no profile yet
      const emp = await pool.query("SELECT * FROM employees WHERE employee_id = $1", [employee_id]);
      if (emp.rowCount === 0)
        return res.status(404).json({ detail: "Employee not found" });

      const e = emp.rows[0];
      return res.json({
        employee_id: employee_id,
        name: `${e.first_name} ${e.last_name}`,
        email: e.email,
        department: e.department,
        phone: e.phone,
        position: e.position,
        company: "Test Company",
        location: "Unknown",
        about: "",
        skills: [],
        certifications: [],
        manager: "Not Assigned",
        date_of_joining: e.date_of_joining,
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`[v0] Error fetching profile ${employee_id}: ${error.message}`);
    res.status(500).json({ detail: "Failed to fetch profile" });
  }
});

/**
 * ✅ PUT /api/employees/:employee_id/profile
 * Update or create an employee profile
 */
router.put("/:employee_id/profile", async (req, res) => {
  const { employee_id } = req.params;
  const data = req.body;
  console.log(`[v0] Updating profile for employee: ${employee_id}`);

  try {
    const exists = await pool.query(
      "SELECT * FROM employee_profiles WHERE employee_id = $1",
      [employee_id]
    );

    if (exists.rowCount > 0) {
      await pool.query(
        `
        UPDATE employee_profiles
        SET about = $1, job_love = $2, interests = $3, skills = $4, certifications = $5,
            manager = $6, location = $7, gender = $8, marital_status = $9, nationality = $10
        WHERE employee_id = $11;
        `,
        [
          data.about || "",
          data.job_love || "",
          data.interests || "",
          JSON.stringify(data.skills || []),
          JSON.stringify(data.certifications || []),
          data.manager || "",
          data.location || "",
          data.gender || "",
          data.marital_status || "",
          data.nationality || "",
          employee_id,
        ]
      );
    } else {
      await pool.query(
        `
        INSERT INTO employee_profiles
        (employee_id, about, job_love, interests, skills, certifications, manager, location, gender, marital_status, nationality)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);
        `,
        [
          employee_id,
          data.about || "",
          data.job_love || "",
          data.interests || "",
          JSON.stringify(data.skills || []),
          JSON.stringify(data.certifications || []),
          data.manager || "",
          data.location || "",
          data.gender || "",
          data.marital_status || "",
          data.nationality || "",
        ]
      );
    }

    res.json({ message: "Profile updated successfully", employee_id });
  } catch (error) {
    console.error(`[v0] Error updating profile ${employee_id}: ${error.message}`);
    res.status(500).json({ detail: "Failed to update profile" });
  }
});

/**
 * ✅ GET /api/employees/:employee_id/salary
 * Fetch salary info for employee
 */
router.get("/:employee_id/salary", async (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching salary info for employee: ${employee_id}`);

  try {
    const result = await pool.query(
      "SELECT * FROM employee_salary WHERE employee_id = $1",
      [employee_id]
    );

    if (result.rowCount === 0) {
      return res.json({
        employee_id,
        month_wage: 50000,
        yearly_wage: 600000,
        working_days_per_week: 5,
        break_time: 1,
        pf_rate: 12.0,
        professional_tax: 200.0,
        salary_components: [
          { id: "basic", name: "Basic Salary", computation_type: "percentage", value: 50.0 },
          { id: "hra", name: "House Rent Allowance", computation_type: "percentage", value: 50.0 },
        ],
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`[v0] Error fetching salary ${employee_id}: ${error.message}`);
    res.status(500).json({ detail: "Failed to fetch salary" });
  }
});

/**
 * ✅ PUT /api/employees/:employee_id/salary
 * Update or create salary info
 */
router.put("/:employee_id/salary", async (req, res) => {
  const { employee_id } = req.params;
  const data = req.body;
  console.log(`[v0] Updating salary info for employee: ${employee_id}`);

  try {
    const exists = await pool.query(
      "SELECT * FROM employee_salary WHERE employee_id = $1",
      [employee_id]
    );

    if (exists.rowCount > 0) {
      await pool.query(
        `
        UPDATE employee_salary
        SET month_wage = $1, yearly_wage = $2, pf_rate = $3, professional_tax = $4, salary_components = $5
        WHERE employee_id = $6;
        `,
        [
          data.month_wage,
          data.yearly_wage,
          data.pf_rate,
          data.professional_tax,
          JSON.stringify(data.salary_components || []),
          employee_id,
        ]
      );
    } else {
      await pool.query(
        `
        INSERT INTO employee_salary
        (employee_id, month_wage, yearly_wage, pf_rate, professional_tax, salary_components)
        VALUES ($1,$2,$3,$4,$5,$6);
        `,
        [
          employee_id,
          data.month_wage,
          data.yearly_wage,
          data.pf_rate,
          data.professional_tax,
          JSON.stringify(data.salary_components || []),
        ]
      );
    }

    res.json({ message: "Salary information updated successfully", employee_id });
  } catch (error) {
    console.error(`[v0] Error updating salary ${employee_id}: ${error.message}`);
    res.status(500).json({ detail: "Failed to update salary information" });
  }
});

export default router;

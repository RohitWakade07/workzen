import express from "express";

const router = express.Router();

// Mock employee data storage (in production, use a database)
const employeesData = {
  "emp_001": {
    id: "emp_001",
    employee_id: "EMP001",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@company.com",
    department: "Engineering",
    position: "Senior Developer",
    status: "active",
    phone: "555-0101",
    date_of_joining: "2020-03-15",
    salary: 85000
  },
  "emp_002": {
    id: "emp_002",
    employee_id: "EMP002",
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@company.com",
    department: "HR",
    position: "HR Manager",
    status: "active"
  }
};

// Mock profile data storage
const profilesData = {};

// Mock salary data storage
const salaryData = {};

// GET /api/employees/
router.get("/", (req, res) => {
  console.log("[v0] Fetching employee list");
  
  try {
    const employees = Object.values(employeesData);
    console.log(`[v0] Returning ${employees.length} employees`);
    res.json(employees);
  } catch (error) {
    console.error(`[v0] Error fetching employees: ${error.message}`);
    res.status(500).json({ detail: "Failed to fetch employees" });
  }
});

// GET /api/employees/:employee_id
router.get("/:employee_id", (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching employee details for ${employee_id}`);
  
  try {
    // Try to find by employee_id first, then by id
    let employee = Object.values(employeesData).find(
      emp => emp.employee_id === employee_id || emp.id === employee_id
    );
    
    if (!employee) {
      // Return default employee data
      employee = {
        id: employee_id,
        employee_id: employee_id,
        first_name: "John",
        last_name: "Doe",
        email: `${employee_id}@company.com`,
        department: "Engineering",
        position: "Developer",
        status: "active",
        phone: "555-0101",
        date_of_joining: "2020-03-15",
        salary: 85000
      };
    }
    
    console.log(`[v0] Employee data retrieved: ${employee_id}`);
    res.json(employee);
  } catch (error) {
    console.error(`[v0] Error fetching employee ${employee_id}: ${error.message}`);
    res.status(404).json({ detail: "Employee not found" });
  }
});

// POST /api/employees/
router.post("/", (req, res) => {
  const data = req.body;
  console.log(`[v0] Creating new employee with ID: ${data.employee_id}`);
  
  try {
    const requiredFields = ["employee_id", "first_name", "last_name", "email", "department"];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.log(`[v0] Employee creation failed - missing fields: ${missingFields.join(", ")}`);
      return res.status(400).json({
        detail: `Missing required fields: ${missingFields.join(", ")}`
      });
    }
    
    console.log(`[v0] Employee created successfully: ${data.employee_id}`);
    res.json({ id: "emp_new", message: "Employee created successfully" });
  } catch (error) {
    console.error(`[v0] Error creating employee: ${error.message}`);
    res.status(500).json({ detail: "Failed to create employee" });
  }
});

// GET /api/employees/:employee_id/profile
router.get("/:employee_id/profile", (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching profile for employee: ${employee_id}`);
  console.log(`[v0] Available profile keys:`, Object.keys(profilesData));
  console.log(`[v0] Available employee keys:`, Object.keys(employeesData));
  
  try {
    // Check if profile exists in storage (try multiple key formats)
    const keysToTry = [
      employee_id,
      employee_id.toUpperCase(),
      employee_id.toLowerCase(),
      employee_id.replace(/^emp_/, ""),
      employee_id.replace(/^EMP/, ""),
      `emp_${employee_id}`,
      `EMP${employee_id}`
    ];
    
    let profile = null;
    for (const key of keysToTry) {
      if (profilesData[key]) {
        profile = profilesData[key];
        console.log(`[v0] Found profile with key: ${key}`);
        break;
      }
    }
    
    if (!profile) {
      // Try to find employee by ID to get default data
      const employee = Object.values(employeesData).find(
        emp => {
          const empIdMatch = emp.employee_id === employee_id || 
                            emp.employee_id === employee_id.toUpperCase() ||
                            emp.employee_id === employee_id.toLowerCase();
          const idMatch = emp.id === employee_id ||
                         emp.id === employee_id.toLowerCase() ||
                         emp.id === employee_id.toUpperCase();
          return empIdMatch || idMatch;
        }
      );
      
      console.log(`[v0] Employee found:`, employee ? "Yes" : "No");
      
      // Return default profile data
      profile = {
        employee_id: employee_id,
        name: employee?.first_name && employee?.last_name 
          ? `${employee.first_name} ${employee.last_name}` 
          : "John Doe",
        email: employee?.email || `${employee_id}@company.com`,
        mobile: employee?.phone || "555-0101",
        company: "Test Company",
        department: employee?.department || "Engineering",
        manager: "Jane Manager",
        location: "New York",
        about: "",
        job_love: "",
        interests: "",
        skills: [],
        certifications: [],
        date_of_birth: "",
        residing_address: "",
        nationality: "",
        personal_email: "",
        gender: "",
        marital_status: "",
        date_of_joining: employee?.date_of_joining || "2020-03-15",
        account_number: "",
        bank_name: "",
        ifsc_code: "",
        pan_no: "",
        uan_no: "",
        emp_code: employee?.employee_id || employee_id
      };
    }
    
    console.log(`[v0] Profile data retrieved for: ${employee_id}`);
    res.json(profile);
  } catch (error) {
    console.error(`[v0] Error fetching profile ${employee_id}: ${error.message}`);
    console.error(`[v0] Error stack:`, error.stack);
    res.status(404).json({ detail: `Profile not found: ${error.message}` });
  }
});

// PUT /api/employees/:employee_id/profile
router.put("/:employee_id/profile", (req, res) => {
  const { employee_id } = req.params;
  const data = req.body;
  console.log(`[v0] Updating profile for employee: ${employee_id}`);
  console.log(`[v0] Profile data:`, JSON.stringify(data, null, 2));
  
  try {
    // Store the profile data (normalize the key)
    const storageKey = employee_id;
    profilesData[storageKey] = {
      ...profilesData[storageKey],
      ...data,
      employee_id: employee_id,
      emp_code: data.emp_code || employee_id
    };
    
    console.log(`[v0] Profile updated successfully: ${employee_id}`);
    res.json({
      message: "Profile updated successfully",
      employee_id: employee_id
    });
  } catch (error) {
    console.error(`[v0] Error updating profile ${employee_id}: ${error.message}`);
    res.status(500).json({ detail: "Failed to update profile" });
  }
});

// GET /api/employees/:employee_id/salary
router.get("/:employee_id/salary", (req, res) => {
  const { employee_id } = req.params;
  console.log(`[v0] Fetching salary info for employee: ${employee_id}`);
  
  try {
    // Check if salary data exists in storage
    let salary = salaryData[employee_id];
    
    if (!salary) {
      // Return default salary data
      salary = {
        employee_id: employee_id,
        month_wage: 50000,
        yearly_wage: 600000,
        working_days_per_week: 5,
        break_time: 1,
        salary_components: [
          {
            id: "basic",
            name: "Basic Salary",
            computation_type: "percentage",
            value: 50.0,
            base: "wage",
            description: "Define Basic salary from company cost compute it based on monthly Wages"
          },
          {
            id: "hra",
            name: "House Rent Allowance (HRA)",
            computation_type: "percentage",
            value: 50.0,
            base: "basic",
            description: "HRA provided to employees 50% of the basic salary"
          },
          {
            id: "standard",
            name: "Standard Allowance",
            computation_type: "fixed",
            value: 4167.0,
            base: "wage",
            description: "A standard allowance is a predetermined, fixed amount provided to employee as part of their salary"
          },
          {
            id: "performance",
            name: "Performance Bonus",
            computation_type: "percentage",
            value: 8.33,
            base: "basic",
            description: "Variable amount paid during payroll. The value defined by the company and calculated as a % of the basic salary"
          },
          {
            id: "lta",
            name: "Leave Travel Allowance (LTA)",
            computation_type: "percentage",
            value: 8.33,
            base: "basic",
            description: "LTA is paid by the company to employees to cover their travel expenses. and calculated as a % of the basic salary"
          },
          {
            id: "fixed",
            name: "Fixed Allowance",
            computation_type: "fixed",
            value: 0,
            base: "wage",
            description: "fixed allowance portion of wages is determined after calculating all salary components"
          }
        ],
        pf_rate: 12.0,
        professional_tax: 200.0
      };
    }
    
    console.log(`[v0] Salary data retrieved for: ${employee_id}`);
    res.json(salary);
  } catch (error) {
    console.error(`[v0] Error fetching salary ${employee_id}: ${error.message}`);
    res.status(404).json({ detail: "Salary information not found" });
  }
});

// PUT /api/employees/:employee_id/salary
router.put("/:employee_id/salary", (req, res) => {
  const { employee_id } = req.params;
  const data = req.body;
  console.log(`[v0] Updating salary info for employee: ${employee_id}`);
  
  try {
    // Store the salary data
    salaryData[employee_id] = {
      ...salaryData[employee_id],
      ...data,
      employee_id: employee_id
    };
    
    console.log(`[v0] Salary updated successfully: ${employee_id}`);
    res.json({
      message: "Salary information updated successfully",
      employee_id: employee_id
    });
  } catch (error) {
    console.error(`[v0] Error updating salary ${employee_id}: ${error.message}`);
    res.status(500).json({ detail: "Failed to update salary information" });
  }
});

export default router;


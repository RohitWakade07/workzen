# Auth Routes Update - Company Integration

## Changes Needed in auth.js

The current signup flow needs to be updated to support company-based registration. Here are the required changes:

## Option 1: Separate Company Registration (Recommended)

Keep `/api/companies/register` for new companies (already implemented).

Update `/api/auth/signup` to add users to existing companies (admin/HR adds employees):

```javascript
// In routes/auth.js
router.post('/signup', async (req, res) => {
  const { email, password, firstName, lastName, role = 'employee', companyId } = req.body;
  
  // Verify companyId is provided
  if (!companyId) {
    return res.status(400).json({ 
      error: 'Company ID required. Use /api/companies/register to create new company.' 
    });
  }
  
  // Verify company exists and is active
  const companyCheck = await pool.query(
    'SELECT id, is_active, max_employees FROM companies WHERE id = $1',
    [companyId]
  );
  
  if (companyCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }
  
  if (!companyCheck.rows[0].is_active) {
    return res.status(403).json({ error: 'Company account is inactive' });
  }
  
  // Check employee limit
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM employees e JOIN users u ON e.user_id = u.id WHERE u.company_id = $1',
    [companyId]
  );
  
  const currentCount = parseInt(countResult.rows[0].count);
  const maxEmployees = companyCheck.rows[0].max_employees;
  
  if (currentCount >= maxEmployees) {
    return res.status(403).json({ 
      error: `Employee limit reached (${maxEmployees}). Upgrade subscription to add more.` 
    });
  }
  
  // Rest of signup logic...
  // Include company_id in INSERT statement
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, company_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, role, first_name, last_name`,
    [email, hashedPassword, role, firstName, lastName, companyId]
  );
});
```

## Option 2: Auto-Create Company on First Signup

For simpler UX where each signup creates a new company:

```javascript
router.post('/signup', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, firstName, lastName, companyName } = req.body;
    
    await client.query('BEGIN');
    
    // Create company
    const companyResult = await client.query(
      `INSERT INTO companies (name, email)
       VALUES ($1, $2)
       RETURNING id`,
      [companyName || `${firstName} ${lastName}'s Company`, email]
    );
    
    const companyId = companyResult.rows[0].id;
    
    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, company_id)
       VALUES ($1, $2, 'admin', $3, $4, $5)
       RETURNING id, email, role`,
      [email, hashedPassword, firstName, lastName, companyId]
    );
    
    await client.query('COMMIT');
    
    // Generate token and respond
    
  } catch (error) {
    await client.query('ROLLBACK');
    // Handle error
  }
});
```

## Login Updates

Update login to include company info in response:

```javascript
router.post('/login', async (req, res) => {
  // ... existing login logic ...
  
  // After successful authentication:
  const userWithCompany = await pool.query(
    `SELECT u.*, c.name as company_name, c.subscription_plan, c.is_active as company_active
     FROM users u
     JOIN companies c ON u.company_id = c.id
     WHERE u.id = $1`,
    [user.id]
  );
  
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      companyId: user.company_id  // Include in JWT
    },
    process.env.JWT_SECRET
  );
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      company: {
        id: user.company_id,
        name: userWithCompany.rows[0].company_name,
        plan: userWithCompany.rows[0].subscription_plan
      }
    }
  });
});
```

## Frontend Changes

### Registration Component

Add company selection for employee signup:

```typescript
// For admin adding employees
const signupEmployee = async (data) => {
  const response = await fetch('http://localhost:8000/api/auth/signup', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      companyId: currentUser.companyId  // From logged-in admin
    })
  });
};
```

### New Company Registration Component

```typescript
const registerNewCompany = async (data) => {
  const response = await fetch('http://localhost:8000/api/companies/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      adminFirstName: data.adminFirstName,
      adminLastName: data.adminLastName,
      adminEmail: data.adminEmail,
      adminPassword: data.adminPassword,
      subscriptionPlan: data.plan || 'basic'
    })
  });
  
  const result = await response.json();
  
  // Auto-login with returned admin credentials
  if (result.admin) {
    await login(result.admin.email, data.adminPassword);
  }
};
```

## Middleware Integration

Update authenticateToken to verify company access:

```javascript
const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and company is active
    const result = await pool.query(
      `SELECT u.*, c.is_active as company_active
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    if (!result.rows[0].company_active) {
      return res.status(403).json({ error: 'Company account is inactive' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Summary

**Choose your flow:**

1. **Separate Registration** (Recommended for B2B SaaS)
   - `/api/companies/register` - New companies sign up
   - `/api/auth/signup` - Admins add employees to their company
   - Clear separation of concerns

2. **Simplified Flow** (For simpler apps)
   - Every signup creates a new company
   - User becomes admin automatically
   - Good for small teams

**Next Steps:**
1. Update `routes/auth.js` with chosen approach
2. Add company_id to JWT token payload
3. Update frontend signup forms
4. Test employee limit enforcement
5. Add company selection UI for admins

The `companies.js` route is already created and ready to use!

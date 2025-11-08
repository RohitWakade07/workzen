# WorkZen HRMS Backend Server

Node.js/Express backend server for WorkZen HRMS.

## Setup

1. Install dependencies:
```bash
cd backend-server
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:8000` by default.

## Environment Variables

Create a `.env` file in the `backend-server` directory:

```env
PORT=8000
NODE_ENV=development

# PostgreSQL Database Configuration (Optional)
# If not configured, backend will use in-memory storage
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workzen_hrms
DB_USER=postgres
DB_PASSWORD=postgres
```

## Database Connection

### Check Database Connection

To verify PostgreSQL connection:

```bash
npm run check-db
```

### Health Check Endpoint

The `/api/health` endpoint will show database connection status:

```bash
curl http://localhost:8000/api/health
```

### Database Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create Database**:
   ```sql
   CREATE DATABASE workzen_hrms;
   ```
3. **Run Schema Scripts** (from project root):
   ```bash
   psql -U postgres -d workzen_hrms -f scripts/001-init-schema.sql
   ```
4. **Configure `.env`** with your database credentials
5. **Test Connection**:
   ```bash
   npm run check-db
   ```

**Note**: If PostgreSQL is not configured, the backend will automatically use in-memory storage (mock data) for development.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/validate-token` - Token validation

### Employees
- `GET /api/employees/` - List employees
- `GET /api/employees/:employee_id` - Get employee details
- `POST /api/employees/` - Create employee
- `GET /api/employees/:employee_id/profile` - Get employee profile
- `PUT /api/employees/:employee_id/profile` - Update employee profile
- `GET /api/employees/:employee_id/salary` - Get employee salary
- `PUT /api/employees/:employee_id/salary` - Update employee salary

### Attendance
- `POST /api/attendance/check-in` - Record check-in
- `POST /api/attendance/check-out` - Record check-out
- `GET /api/attendance/:emp_id` - Get attendance records

### Leave Management
- `GET /api/leave/balance/:id` - Get leave balance
- `POST /api/leave/request` - Submit time-off request
- `GET /api/leave/requests/:id` - Get time-off requests
- `POST /api/leave/approve/:id` - Approve leave request

### Payroll
- `GET /api/payroll/runs` - List payruns
- `POST /api/payroll/runs` - Create payrun
- `POST /api/payroll/approve/:payrun_id` - Approve payrun
- `GET /api/payroll/:employee_id/payslips` - Get payslips

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/settings` - Get system settings
- `POST /api/admin/settings` - Update settings
- `GET /api/admin/audit-logs` - Get audit logs

## Notes

- Currently uses in-memory storage (mock data)
- In production, replace with a real database (MongoDB, PostgreSQL, etc.)
- All endpoints return JSON responses
- Error responses follow the format: `{ detail: "error message" }`


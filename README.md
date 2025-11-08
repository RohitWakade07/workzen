# WorkZen HRMS - Enterprise Human Resource Management System

A comprehensive, role-based HRMS platform with complete frontend (Next.js) and backend (FastAPI) implementation.

## Features

### Role-Based Access Control
- **Employee**: Attendance tracking, time-off requests, payslip viewing
- **HR Officer**: Employee management, leave allocation, leave approvals
- **Payroll Officer**: Payrun creation, payroll processing, approval tracking
- **Admin**: System settings, user management, audit logs

### Core Modules
✅ **Authentication** - Secure login/signup with role selection  
✅ **Employee Dashboard** - Attendance, time off, payslips  
✅ **HR Management** - Employee CRUD, leave allocation  
✅ **Payroll System** - Multi-level payrun approvals, detailed entries  
✅ **Admin Panel** - User management, system settings, audit logs  
✅ **Database** - PostgreSQL schema with proper relationships

### Debug Features
- Comprehensive logging with `[v0]` prefix on all operations
- Real-time error tracking in console
- Database fallback (SQLite for dev, PostgreSQL for production)
- Request/response validation with detailed error messages

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 12+ (optional - SQLite used by default for development)

### Frontend Setup (Next.js)

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
\`\`\`

**Demo Credentials:**
\`\`\`
Employee:        employee@test.com / password
HR Officer:      hr@test.com / password
Payroll Officer: payroll@test.com / password
Admin:           admin@test.com / password
\`\`\`

### Backend Setup (FastAPI)

\`\`\`bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py

# API documentation available at http://localhost:8000/docs
\`\`\`

### Database Setup (PostgreSQL)

#### Option 1: Local PostgreSQL

\`\`\`bash
# Create database
createdb workzen_hrms

# Run migration scripts
psql -U postgres -d workzen_hrms -f scripts/001-init-schema.sql
psql -U postgres -d workzen_hrms -f scripts/002-seed-data.sql

# Set environment variable
export DATABASE_URL="postgresql://postgres:password@localhost/workzen_hrms"
\`\`\`

#### Option 2: SQLite (Development - No Setup Required)

Default fallback is SQLite for local development. No additional setup needed!

#### Option 3: Docker

\`\`\`bash
# Start PostgreSQL container
docker run --name workzen-db \
  -e POSTGRES_DB=workzen_hrms \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# Set environment variable
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/workzen_hrms"

# Run migrations
psql -U postgres -h localhost -d workzen_hrms -f scripts/001-init-schema.sql
\`\`\`

## Database Schema

### Core Tables

**Users** - Authentication and authorization
- Role-based access (employee, hr_officer, payroll_officer, admin)
- Security features (failed login tracking, 2FA support)

**Employees** - Employee master data
- Department, position, salary information
- Employment type and status tracking

**Attendance** - Daily check-in/check-out records
- Automatic hours calculation
- Status tracking (present, absent, half-day, late)

**Leave Management** - Time-off workflows
- Leave allocations per fiscal year
- Time-off requests with multi-level approvals
- Leave tracking and balance management

**Payroll** - Salary processing
- Payrun management with status workflow
- Detailed payroll entries (earnings + deductions)
- Multi-level approval workflow

**Admin** - System management
- System settings and configuration
- Audit logs for compliance

### Data Validation

All tables include:
- ✅ CHECK constraints (e.g., salary > 0)
- ✅ FOREIGN KEY relationships
- ✅ UNIQUE constraints
- ✅ NOT NULL constraints
- ✅ Date range validation (end_date >= start_date)
- ✅ Status enum validation

## API Endpoints

### Authentication
\`\`\`
POST   /api/auth/login           - User login
POST   /api/auth/signup          - User registration
POST   /api/auth/logout          - User logout
GET    /api/auth/validate-token  - Token validation
\`\`\`

### Employees
\`\`\`
GET    /api/employees/           - List employees
GET    /api/employees/{id}       - Get employee details
POST   /api/employees/           - Create employee
\`\`\`

### Attendance
\`\`\`
POST   /api/attendance/check-in  - Record check-in
POST   /api/attendance/check-out - Record check-out
GET    /api/attendance/{emp_id}  - Get attendance records
\`\`\`

### Leave Management
\`\`\`
GET    /api/leave/balance/{id}   - Get leave balance
POST   /api/leave/request        - Submit time-off request
GET    /api/leave/requests/{id}  - Get time-off requests
POST   /api/leave/approve/{id}   - Approve leave request
\`\`\`

### Payroll
\`\`\`
GET    /api/payroll/runs         - List payruns
POST   /api/payroll/runs         - Create payrun
POST   /api/payroll/approve/{id} - Approve payrun
GET    /api/payroll/{id}/payslips - Get payslips
\`\`\`

### Admin
\`\`\`
GET    /api/admin/users          - List users
POST   /api/admin/users          - Create user
GET    /api/admin/settings       - Get system settings
POST   /api/admin/settings       - Update settings
GET    /api/admin/audit-logs     - Get audit logs
\`\`\`

## Debug Logging

Every module includes comprehensive debug logging with `[v0]` prefix:

\`\`\`
[v0] EmployeeDashboard: Rendered
[v0] AttendanceModule: Check-in initiated for 2025-11-08
[v0] TimeOffModule: Submitting request with role employee
[v0] LeaveApprovalsModule: Approving request lr_001 with notes: Approved
[v0] PayrunModule: Submitting payrun for approval pr_202411
\`\`\`

Check browser console (Frontend) and terminal (Backend) for execution flow.

## Environment Variables

\`\`\`env
# Backend
DATABASE_URL=postgresql://user:pass@localhost/workzen_hrms
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
ECHO_SQL=false

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Email (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
\`\`\`

## Deployment

### Frontend (Vercel)
\`\`\`bash
npm run build
vercel deploy
\`\`\`

### Backend (Railway/Heroku)
\`\`\`bash
# Set environment variables in platform
gunicorn -w 4 -b 0.0.0.0:8000 main:app
\`\`\`

## Data Flow & Status Workflows

### Leave Request Workflow
\`\`\`
Employee submits → HR Approves → Admin Approves → Approved
                ↓
              Rejected
\`\`\`

### Payroll Workflow
\`\`\`
Payroll Officer creates (draft) 
→ Submits for approval 
→ Admin approves 
→ Processed 
→ Payment completed
\`\`\`

### Attendance Status
- **Present**: Check-in & check-out recorded
- **Half-day**: Only check-in or check-out
- **Absent**: No check-in or check-out
- **Late**: Check-in after 10:00 AM
- **Early Leave**: Check-out before 5:00 PM

## Troubleshooting

### Frontend Issues
- **"Cannot find user"**: Login with demo credentials (see Quick Start)
- **Dashboard not loading**: Check browser console for `[v0]` error messages
- **Styling issues**: Run `npm install` to ensure all dependencies are installed

### Backend Issues
- **Database connection failed**: 
  - Check PostgreSQL is running: `psql -U postgres`
  - Or use default SQLite (no setup needed)
- **Port 8000 already in use**: `kill $(lsof -t -i:8000)` or change port in `main.py`
- **Module import errors**: Run `pip install -r requirements.txt`

### Database Issues
- **Migration failed**: Check script syntax in `scripts/` directory
- **Constraint violations**: Review seed data and ensure proper relationships
- **Performance slow**: Check indexes are created: `\di` in psql

## Testing

### Manual Testing Scenarios

1. **Employee Attendance**
   - Login as employee, check-in
   - Verify hours calculated automatically
   - Check-out and verify payslip generation

2. **Leave Approval**
   - Submit leave as employee
   - Approve as HR officer
   - View approval history

3. **Payroll Processing**
   - Create payrun as payroll officer
   - Submit for approval
   - Approve as admin
   - Verify payslips generated

## Security Features

- ✅ Role-based access control (RBAC)
- ✅ Password hashing (bcrypt ready)
- ✅ JWT token authentication
- ✅ SQL injection prevention (ORM + parameterized queries)
- ✅ CORS protection
- ✅ Audit logging of all actions
- ✅ Failed login attempt tracking
- ✅ Session management with timeout

## Performance Optimizations

- Database indexes on frequently queried fields
- View for common aggregate queries
- Connection pooling
- Lazy loading of data
- Pagination support

## Future Enhancements

- [ ] OAuth/SSO integration
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced reporting/analytics
- [ ] Bulk upload (CSV)
- [ ] Workflow automation
- [ ] Multi-company support
- [ ] Bi-annual/quarterly leave allocations

## Support & Documentation

- **Frontend Debug**: Check browser console for `[v0]` prefixed messages
- **Backend Debug**: Check terminal output during API calls
- **Database Schema**: Review `scripts/001-init-schema.sql`
- **API Docs**: Visit `http://localhost:8000/docs` (Swagger)

## License

MIT License - Free for commercial and personal use

---

**Built with:**
- Next.js 16 (Frontend)
- FastAPI (Backend)
- PostgreSQL (Database)
- TailwindCSS (Styling)
- SQLAlchemy (ORM)

Made for enterprise HR management with ❤️

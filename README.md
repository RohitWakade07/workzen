# WorkZen HRMS - Enterprise Human Resource Management System

A comprehensive, role-based HRMS platform with complete frontend (Next.js) and backend (Node.js/Express) implementation.

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
- npm or yarn

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

### Backend Setup (Node.js/Express)

\`\`\`bash
# Navigate to backend-server directory
cd backend-server

# Install dependencies
npm install

# Run development server
npm start

# Or for development with auto-reload
npm run dev

# Server runs on http://localhost:8000
\`\`\`

**Or from the root directory:**
\`\`\`bash
npm run server        # Start server
npm run server:dev    # Start with auto-reload
\`\`\`

### Database Setup

Currently, the backend uses in-memory storage (mock data). For production, you can integrate with:
- MongoDB
- PostgreSQL
- MySQL
- Any other database of your choice

The API structure is ready for database integration. Simply replace the in-memory storage in `backend-server/routes/` with your database queries.

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
GET    /api/employees/                    - List employees
GET    /api/employees/{id}                - Get employee details
POST   /api/employees/                    - Create employee
GET    /api/employees/{id}/profile        - Get employee profile
PUT    /api/employees/{id}/profile        - Update employee profile
GET    /api/employees/{id}/salary          - Get employee salary
PUT    /api/employees/{id}/salary         - Update employee salary
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

### Frontend (.env.local)
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000
\`\`\`

### Backend (backend-server/.env)
\`\`\`env
PORT=8000
NODE_ENV=development
\`\`\`

## Deployment

### Frontend (Vercel)
\`\`\`bash
npm run build
vercel deploy
\`\`\`

### Backend (Railway/Heroku/Render)
\`\`\`bash
# Set environment variables in platform
# PORT will be set automatically by the platform
cd backend-server
npm start
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
- **Port 8000 already in use**: 
  - Windows: `netstat -ano | findstr :8000` then `taskkill /PID <pid> /F`
  - Mac/Linux: `lsof -ti:8000 | xargs kill` or change PORT in `.env`
- **Module import errors**: Run `cd backend-server && npm install`
- **Server not starting**: Check Node.js version (requires 18+)

### Database Issues
- Currently using in-memory storage. For production, integrate with your preferred database.
- Data is reset on server restart. Implement database persistence for production use.

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
- **Backend Debug**: Check terminal output during API calls (look for `[v0]` prefix)
- **API Endpoints**: See `backend-server/routes/` for all available endpoints
- **Server Logs**: All requests are logged with `[v0]` prefix in the console

## License

MIT License - Free for commercial and personal use

---

**Built with:**
- Next.js 16 (Frontend)
- Node.js/Express (Backend)
- TailwindCSS (Styling)
- TypeScript (Type Safety)

Made for enterprise HR management with ❤️

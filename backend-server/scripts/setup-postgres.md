# PostgreSQL Setup Instructions

## Quick Fix for Authentication Error

The error "password authentication failed for user 'postgres'" means PostgreSQL is running but the password is incorrect.

### Option 1: Set Correct Password in .env

1. Find your PostgreSQL password (or reset it)
2. Create `backend-server/.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workzen_hrms
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

### Option 2: Reset PostgreSQL Password

**Windows (PowerShell as Administrator):**
```powershell
# Connect to PostgreSQL
psql -U postgres

# In psql prompt:
ALTER USER postgres WITH PASSWORD 'newpassword';
\q

# Then update .env with the new password
```

**Or use pgAdmin:**
1. Open pgAdmin
2. Right-click on "Login/Group Roles" → "postgres"
3. Go to "Definition" tab
4. Set new password
5. Save

### Option 3: Use Trust Authentication (Development Only)

Edit PostgreSQL's `pg_hba.conf` file (usually in PostgreSQL data directory):
```
# Change this line:
host    all             all             127.0.0.1/32            md5

# To this (for localhost only):
host    all             all             127.0.0.1/32            trust
```

Then restart PostgreSQL service.

### Option 4: Skip PostgreSQL (Use In-Memory Storage)

If you don't want to use PostgreSQL right now:
- **Don't create a `.env` file** in `backend-server/`
- The backend will automatically use in-memory storage
- All data will be lost on server restart (fine for development)

## Verify Connection

After setting up, test:
```bash
cd backend-server
npm run check-db
```

You should see:
```
✓ Connection: SUCCESS
✓ Database: CONNECTED
```


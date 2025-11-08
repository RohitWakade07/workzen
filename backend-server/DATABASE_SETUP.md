# PostgreSQL Database Setup Guide

## Current Status

The backend is configured to connect to PostgreSQL, but the connection is currently **NOT ESTABLISHED** due to authentication failure.

## Quick Check

Run this command to check database connection status:

```bash
cd backend-server
npm run check-db
```

Or check the health endpoint when server is running:

```bash
curl http://localhost:8000/api/health
```

## Setup PostgreSQL Connection

### Step 1: Install PostgreSQL (if not installed)

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Or use: `choco install postgresql` (if Chocolatey is installed)

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE workzen_hrms;

# Exit psql
\q
```

### Step 3: Configure Environment Variables

Create or edit `backend-server/.env` file:

```env
PORT=8000
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workzen_hrms
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
```

**Important:** Replace `your_postgres_password_here` with your actual PostgreSQL password.

### Step 4: Initialize Database Schema

From the project root directory:

```bash
psql -U postgres -d workzen_hrms -f scripts/001-init-schema.sql
```

### Step 5: Test Connection

```bash
cd backend-server
npm run check-db
```

You should see:
```
✓ Connection: SUCCESS
✓ Database: CONNECTED
```

## Troubleshooting

### Authentication Failed

**Error:** `password authentication failed for user "postgres"`

**Solutions:**
1. Check your PostgreSQL password in `.env` file
2. Reset PostgreSQL password:
   ```bash
   # Windows (run as Administrator)
   psql -U postgres
   ALTER USER postgres WITH PASSWORD 'newpassword';
   ```
3. Check `pg_hba.conf` file for authentication settings

### Database Does Not Exist

**Error:** `database "workzen_hrms" does not exist`

**Solution:**
```sql
CREATE DATABASE workzen_hrms;
```

### Connection Refused

**Error:** `connect ECONNREFUSED`

**Solutions:**
1. Check if PostgreSQL is running:
   ```bash
   # Windows
   Get-Service postgresql*
   
   # Mac/Linux
   sudo systemctl status postgresql
   ```
2. Start PostgreSQL service if not running
3. Check if port 5432 is correct

### Port Already in Use

**Error:** `Port 5432 is already in use`

**Solution:**
- Check what's using the port
- Change `DB_PORT` in `.env` to a different port
- Or stop the conflicting service

## Current Behavior

- **If PostgreSQL is connected:** Backend will use PostgreSQL database
- **If PostgreSQL is NOT connected:** Backend will use in-memory storage (mock data)
- **Server will still start** even if database connection fails
- **Health endpoint** (`/api/health`) shows database connection status

## Verify Connection

### Method 1: Command Line
```bash
cd backend-server
npm run check-db
```

### Method 2: Health Endpoint
```bash
curl http://localhost:8000/api/health
```

### Method 3: Server Logs
When you start the server, it will automatically test the connection:
```bash
cd backend-server
npm start
```

Look for:
```
[v0] ✓ Database connection successful
```
or
```
[v0] ✗ Database connection failed: [error message]
```

## Next Steps

Once PostgreSQL is connected:
1. The backend will automatically use the database
2. You can start migrating routes to use database queries
3. Replace in-memory storage in `routes/` files with database queries
4. Use the `pool` export from `config/database.js` for queries

Example:
```javascript
import pool from "../config/database.js";

// In your route handler
const result = await pool.query("SELECT * FROM employees WHERE id = $1", [employeeId]);
```


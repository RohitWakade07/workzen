# How to Update PostgreSQL Password in .env

## Current Status
✅ `.env` file created  
❌ PostgreSQL password authentication failed

## Quick Fix

### Step 1: Find or Reset Your PostgreSQL Password

**Option A: If you know your password**
- Open `backend-server/.env` in a text editor
- Replace `DB_PASSWORD=postgres` with your actual password

**Option B: Reset PostgreSQL Password**

**Using PowerShell (as Administrator):**
```powershell
# Connect to PostgreSQL (you may need to enter current password)
psql -U postgres

# In psql prompt, run:
ALTER USER postgres WITH PASSWORD 'your_new_password';
\q
```

**Using pgAdmin (GUI):**
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Expand "Login/Group Roles"
4. Right-click on "postgres" → Properties
5. Go to "Definition" tab
6. Enter new password
7. Click Save

### Step 2: Update .env File

Edit `backend-server/.env` and change:
```env
DB_PASSWORD=postgres
```

To your actual password:
```env
DB_PASSWORD=your_actual_password
```

### Step 3: Test Connection

```bash
cd backend-server
npm run check-db
```

You should see:
```
✓ Connection: SUCCESS
✓ Database: CONNECTED
```

## Alternative: Use In-Memory Storage

If you don't want to configure PostgreSQL right now:
1. Delete or rename `backend-server/.env` file
2. Backend will automatically use in-memory storage
3. Works fine for development/testing

## File Location
The `.env` file is located at:
```
backend-server/.env
```


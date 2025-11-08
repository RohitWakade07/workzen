# Quick Start - PostgreSQL Setup

## Step 1: Create the Database

Open PostgreSQL and create a database:

```sql
CREATE DATABASE workzen_hrms;
```

Or using command line:
```bash
createdb workzen_hrms
```

## Step 2: Create .env File

In the `backend` directory, create a `.env` file with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/workzen_hrms
ECHO_SQL=false
SECRET_KEY=dev-secret-key-change-in-production
ENVIRONMENT=development
```

**Replace:**
- `username` - Your PostgreSQL username (usually `postgres`)
- `password` - Your PostgreSQL password
- `workzen_hrms` - Your database name

**Example:**
```env
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/workzen_hrms
```

## Step 3: Test Connection (Optional)

Run the setup script to test your connection:

```bash
cd backend
python setup_database.py
```

## Step 4: Start the Server

```bash
python main.py
```

Or:
```bash
uvicorn main:app --reload
```

The application will automatically create all necessary tables on first startup.

## Verify Connection

1. Check the console output - you should see:
   ```
   [v0] Using PostgreSQL database: localhost:5432/workzen_hrms
   [v0] Database tables verified/created
   ```

2. Visit `http://localhost:8000/api/health` to verify the connection.

## Troubleshooting

**Connection refused:**
- Make sure PostgreSQL is running
- Check if port 5432 is correct
- Verify firewall settings

**Authentication failed:**
- Double-check username and password in `.env`
- Try connecting with psql to verify credentials

**Database doesn't exist:**
- Create the database first (Step 1)
- Verify the database name in `DATABASE_URL`


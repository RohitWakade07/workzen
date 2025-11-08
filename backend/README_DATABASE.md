# Database Setup Guide

This guide will help you connect your local PostgreSQL database to the WorkZen HRMS project.

## Prerequisites

1. PostgreSQL installed and running on your local machine
2. Python 3.9+ installed
3. All Python dependencies installed (`pip install -r requirements.txt`)

## Step 1: Create PostgreSQL Database

1. Open PostgreSQL command line or pgAdmin
2. Create a new database:

```sql
CREATE DATABASE workzen_hrms;
```

Or using command line:
```bash
createdb workzen_hrms
```

## Step 2: Configure Database Connection

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file and update the `DATABASE_URL` with your PostgreSQL credentials:

   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/workzen_hrms
   ```

   Replace:
   - `username` - Your PostgreSQL username (default: `postgres`)
   - `password` - Your PostgreSQL password
   - `localhost` - Database host (use `localhost` for local)
   - `5432` - PostgreSQL port (default: 5432)
   - `workzen_hrms` - Database name

### Connection String Formats

**Standard format:**
```
postgresql://username:password@localhost:5432/database_name
```

**With psycopg2 driver (explicit):**
```
postgresql+psycopg2://username:password@localhost:5432/database_name
```

**Example:**
```
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/workzen_hrms
```

## Step 3: Test Database Connection

1. Start the FastAPI server:
   ```bash
   cd backend
   python main.py
   ```

   Or using uvicorn:
   ```bash
   uvicorn main:app --reload
   ```

2. Check the console output. You should see:
   ```
   [v0] Using PostgreSQL database: localhost:5432/workzen_hrms
   [v0] Database tables verified/created
   ```

3. Visit `http://localhost:8000/api/health` to verify the database connection.

## Step 4: Database Tables

The application will automatically create all necessary tables when you start the server for the first time. The tables are created using SQLAlchemy's `Base.metadata.create_all()`.

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running: `pg_ctl status` or check services
- Verify the port (default: 5432)
- Check firewall settings

### Authentication Failed
- Verify username and password in `.env`
- Check PostgreSQL authentication settings in `pg_hba.conf`

### Database Does Not Exist
- Create the database first (see Step 1)
- Verify the database name in `DATABASE_URL`

### Module Not Found: psycopg2
- Install the PostgreSQL adapter: `pip install psycopg2-binary`
- Or reinstall all requirements: `pip install -r requirements.txt`

### Connection Pool Issues
- Adjust `pool_size` and `max_overflow` in `database.py` if needed
- Check PostgreSQL `max_connections` setting

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `sqlite:///./workzen_hrms.db` |
| `ECHO_SQL` | Log SQL queries to console | `false` |
| `SECRET_KEY` | Secret key for JWT tokens | `dev-secret-key-change-in-production` |
| `ENVIRONMENT` | Application environment | `development` |

## Security Notes

- Never commit `.env` file to version control
- Use strong passwords in production
- Change `SECRET_KEY` in production
- Use environment-specific `.env` files for different environments


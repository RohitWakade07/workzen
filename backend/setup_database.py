#!/usr/bin/env python3
"""
Database setup script for WorkZen HRMS
This script helps you set up and test your PostgreSQL database connection.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

def test_connection(database_url: str):
    """Test database connection"""
    try:
        print(f"Testing connection to: {database_url.split('@')[1] if '@' in database_url else 'database'}...")
        engine = create_engine(database_url, pool_pre_ping=True)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✓ Connection successful!")
            print(f"  PostgreSQL version: {version.split(',')[0]}")
            return True
    except OperationalError as e:
        print(f"✗ Connection failed: {str(e)}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {str(e)}")
        return False

def create_database_if_not_exists(database_url: str, db_name: str):
    """Create database if it doesn't exist"""
    try:
        # Extract connection info without database name
        if '@' in database_url:
            parts = database_url.split('@')
            base_url = parts[0].split('//')[0] + '//' + parts[0].split('//')[1].split('/')[0] + '/postgres'
            if len(parts) > 1:
                base_url += '@' + parts[1]
        else:
            base_url = database_url.rsplit('/', 1)[0] + '/postgres'
        
        print(f"Connecting to PostgreSQL server to create database '{db_name}'...")
        engine = create_engine(base_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("COMMIT"))  # End any transaction
            # Check if database exists
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": db_name}
            )
            exists = result.fetchone() is not None
            
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                conn.commit()
                print(f"✓ Database '{db_name}' created successfully!")
            else:
                print(f"✓ Database '{db_name}' already exists!")
            return True
    except Exception as e:
        print(f"✗ Failed to create database: {str(e)}")
        print("  Please create the database manually:")
        print(f"    CREATE DATABASE {db_name};")
        return False

def main():
    print("=" * 60)
    print("WorkZen HRMS - Database Setup")
    print("=" * 60)
    print()
    
    # Check if .env file exists
    env_file = ".env"
    if not os.path.exists(env_file):
        print(f"⚠ Warning: {env_file} file not found!")
        print()
        print("Please create a .env file with the following content:")
        print()
        print("DATABASE_URL=postgresql://username:password@localhost:5432/workzen_hrms")
        print("ECHO_SQL=false")
        print("SECRET_KEY=dev-secret-key-change-in-production")
        print("ENVIRONMENT=development")
        print()
        print("Replace 'username', 'password', and 'workzen_hrms' with your actual values.")
        print()
        return
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(env_file)
    
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("✗ DATABASE_URL not found in .env file!")
        return
    
    print(f"Database URL: {database_url.split('@')[1] if '@' in database_url else database_url[:50]}...")
    print()
    
    # Extract database name
    if '/@' in database_url or '@' in database_url:
        db_name = database_url.split('/')[-1].split('?')[0]
    else:
        db_name = database_url.split('/')[-1].split('?')[0]
    
    # Test connection
    print("Step 1: Testing database connection...")
    if test_connection(database_url):
        print()
        print("✓ Database setup complete!")
        print()
        print("You can now start the FastAPI server:")
        print("  python main.py")
        print("  or")
        print("  uvicorn main:app --reload")
    else:
        print()
        print("Step 2: Attempting to create database...")
        if create_database_if_not_exists(database_url, db_name):
            print()
            print("Step 3: Testing connection again...")
            if test_connection(database_url):
                print()
                print("✓ Database setup complete!")
            else:
                print()
                print("✗ Please check your database credentials and try again.")
        else:
            print()
            print("✗ Please create the database manually and check your connection settings.")

if __name__ == "__main__":
    main()


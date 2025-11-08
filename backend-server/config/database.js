import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Database configuration
// Only create pool if database credentials are provided
const hasDbConfig = process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASSWORD;

const pool = hasDbConfig ? new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "workzen_hrms",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

// Test database connection (only if pool exists)
if (pool) {
  pool.on("connect", () => {
    console.log("[v0] Database: Connected to PostgreSQL");
  });

  pool.on("error", (err) => {
    console.error("[v0] Database: Unexpected error on idle client", err);
    // Don't exit process, just log the error
  });
}

// Test connection function
export async function testConnection() {
  if (!pool) {
    return { 
      connected: false, 
      error: "Database not configured. Set DB_HOST, DB_USER, and DB_PASSWORD in .env file" 
    };
  }
  
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("[v0] Database: Connection test successful");
    console.log("[v0] Database: Server time:", result.rows[0].now);
    return { connected: true, timestamp: result.rows[0].now };
  } catch (error) {
    console.error("[v0] Database: Connection test failed", error.message);
    return { connected: false, error: error.message };
  }
}

// Get database info
export async function getDatabaseInfo() {
  if (!pool) {
    return {
      connected: false,
      error: "Database not configured",
    };
  }
  
  try {
    const versionResult = await pool.query("SELECT version()");
    const dbNameResult = await pool.query("SELECT current_database()");
    
    return {
      connected: true,
      version: versionResult.rows[0].version,
      database: dbNameResult.rows[0].current_database,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

export default pool;


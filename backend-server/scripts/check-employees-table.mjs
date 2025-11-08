import pool from "../config/database.js";

if (!pool) {
  console.error("Database pool is not configured. Check your environment variables.");
  process.exit(1);
}

try {
  const result = await pool.query("SELECT to_regclass('public.employees') AS table_name");
  console.log(result.rows[0]);
} catch (error) {
  console.error("Error", error.message);
} finally {
  await pool.end();
}

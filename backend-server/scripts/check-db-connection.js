import { testConnection, getDatabaseInfo } from "../config/database.js";

console.log("[v0] Checking PostgreSQL connection...\n");

async function checkConnection() {
  try {
    const connectionTest = await testConnection();
    const dbInfo = await getDatabaseInfo();
    
    console.log("\n=== Connection Test Results ===");
    if (connectionTest.connected) {
      console.log("✓ Connection: SUCCESS");
      console.log(`  Server Time: ${connectionTest.timestamp}`);
    } else {
      console.log("✗ Connection: FAILED");
      console.log(`  Error: ${connectionTest.error}`);
    }
    
    console.log("\n=== Database Information ===");
    if (dbInfo.connected) {
      console.log("✓ Database: CONNECTED");
      console.log(`  Database Name: ${dbInfo.database}`);
      console.log(`  PostgreSQL Version: ${dbInfo.version.split(",")[0]}`);
    } else {
      console.log("✗ Database: NOT CONNECTED");
      console.log(`  Error: ${dbInfo.error}`);
    }
    
    process.exit(connectionTest.connected ? 0 : 1);
  } catch (error) {
    console.error("\n✗ Error checking connection:", error.message);
    process.exit(1);
  }
}

checkConnection();


import pool from "./src/config/db.js";

async function addWasteLogColumns() {
  try {
    console.log("[Migration] Adding missing columns to waste_logs table...");

    // Add notes column if it doesn't exist
    await pool.query(`
      ALTER TABLE waste_logs
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);
    console.log("[Migration] ✅ notes column added (or already exists)");

    // Add rejection_reason column if it doesn't exist
    await pool.query(`
      ALTER TABLE waste_logs
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);
    console.log("[Migration] ✅ rejection_reason column added (or already exists)");

    console.log("[Migration] ✅ All columns verified/added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("[Migration Error]", error.message);
    process.exit(1);
  }
}

addWasteLogColumns();

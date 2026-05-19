import fs from "fs";
import pool from "./src/config/db.js";

async function setupDatabase() {
  try {
    console.log("[DB Setup] Reading schema.sql...");
    const schema = fs.readFileSync("./schema.sql", "utf-8");

    console.log("[DB Setup] Executing schema...");
    await pool.query(schema);

    console.log("[DB Setup] ✅ Database schema created successfully!");

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("[DB Setup] Tables created:");
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("[DB Setup Error]", error.message);
    process.exit(1);
  }
}

setupDatabase();

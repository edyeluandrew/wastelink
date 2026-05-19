import pool from "./src/config/db.js";

async function setupDatabase() {
  try {
    console.log("[DB Setup] Creating tables...");
    
    // Create tables one by one to see progress
    const tables = [
      "users",
      "pickers", 
      "collection_points",
      "waste_logs",
      "earnings"
    ];

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(30),
        password_hash TEXT,
        role VARCHAR(30) NOT NULL,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[DB Setup] ✅ users table created");

    // Pickers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pickers (
        id SERIAL PRIMARY KEY,
        picker_code VARCHAR(30) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) UNIQUE NOT NULL,
        gender VARCHAR(20),
        age_group VARCHAR(30),
        division VARCHAR(100),
        main_waste_type VARCHAR(50),
        status VARCHAR(30) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[DB Setup] ✅ pickers table created");

    // Collection Points table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_points (
        id SERIAL PRIMARY KEY,
        point_code VARCHAR(30) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        division VARCHAR(100),
        agent_name VARCHAR(150),
        agent_phone VARCHAR(30),
        status VARCHAR(30) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[DB Setup] ✅ collection_points table created");

    // Waste Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waste_logs (
        id SERIAL PRIMARY KEY,
        job_code VARCHAR(30) UNIQUE NOT NULL,
        picker_id INT NOT NULL REFERENCES pickers(id),
        collection_point_id INT NOT NULL REFERENCES collection_points(id),
        waste_type VARCHAR(50) NOT NULL,
        estimated_kg NUMERIC(10, 2),
        verified_kg NUMERIC(10, 2),
        status VARCHAR(20) NOT NULL,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[DB Setup] ✅ waste_logs table created");

    // Earnings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS earnings (
        id SERIAL PRIMARY KEY,
        picker_id INT NOT NULL REFERENCES pickers(id),
        waste_log_id INT NOT NULL REFERENCES waste_logs(id),
        rate_per_kg INT NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      )
    `);
    console.log("[DB Setup] ✅ earnings table created");

    console.log("[DB Setup] ✅ All tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("[DB Setup Error]", error.message);
    process.exit(1);
  }
}

setupDatabase();

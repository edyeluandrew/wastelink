import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log('Connecting to Neon PostgreSQL...');
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful:', result.rows[0]);
    
    // Read and execute schema
    const schema = fs.readFileSync('./schema.sql', 'utf-8');
    console.log('Creating tables...');
    
    await pool.query(schema);
    console.log('✓ Database schema created successfully');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();

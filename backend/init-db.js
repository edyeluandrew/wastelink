import pool from './src/config/db.js';
import fs from 'fs';

const logFile = './setup-db.log';

async function setupDatabase() {
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
  };

  try {
    log('[1/2] Connecting to database...');
    const connTest = await pool.query('SELECT NOW()');
    log('✓ Connected to Neon: ' + connTest.rows[0].now);

    log('[2/2] Creating schema...');
    const schema = fs.readFileSync('./schema.sql', 'utf-8');
    
    // Split by statements and execute each one
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await pool.query(stmt);
      log('✓ Executed: ' + stmt.substring(0, 50) + '...');
    }

    log('✓ Database setup complete!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    log('✗ ERROR: ' + error.message);
    log(error.stack);
    process.exit(1);
  }
}

setupDatabase();

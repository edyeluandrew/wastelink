import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connStr = process.env.DATABASE_URL;
console.log('Testing Neon connection with URL:', connStr?.substring(0, 60) + '...');

async function test() {
  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 5000,
  });

  try {
    console.log('[1] Attempting to connect...');
    await client.connect();
    console.log('[2] Connected! Running query...');
    
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log('[3] Query successful!');
    console.log('Time:', result.rows[0].now);
    console.log('Version:', result.rows[0].version.substring(0, 50));
    
    await client.end();
    console.log('[✓] Test passed!');
    process.exit(0);
  } catch (error) {
    console.error('[✗] Error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
    });
    process.exit(1);
  }
}

test();

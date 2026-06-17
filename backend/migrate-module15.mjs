import pool from './src/config/db.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE earnings DROP CONSTRAINT IF EXISTS earnings_status_check
    `);

    await client.query(`
      ALTER TABLE earnings
      ADD CONSTRAINT earnings_status_check
      CHECK (status IN (
        'AVAILABLE','PAYOUT_PROCESSING','PAID','FAILED',
        'PENDING','APPROVED','PAYOUT_INITIATED'
      ))
    `);

    const convertAvailable = await client.query(`
      UPDATE earnings e
      SET status = 'AVAILABLE', updated_at = NOW()
      FROM waste_logs wl
      WHERE e.waste_log_id = wl.id
        AND e.status IN ('PENDING', 'APPROVED')
        AND wl.status IN ('VERIFIED', 'PAID')
        AND e.status NOT IN ('PAID', 'FAILED')
    `);

    const convertProcessing = await client.query(`
      UPDATE earnings
      SET status = 'PAYOUT_PROCESSING', updated_at = NOW()
      WHERE status = 'PAYOUT_INITIATED'
    `);

    await client.query(`
      ALTER TABLE earnings DROP CONSTRAINT IF EXISTS earnings_status_check
    `);

    await client.query(`
      ALTER TABLE earnings
      ADD CONSTRAINT earnings_status_check
      CHECK (status IN ('AVAILABLE','PAYOUT_PROCESSING','PAID','FAILED'))
    `);

    await client.query('COMMIT');

    console.log('Module 15 migration completed.');
    console.log('Converted to AVAILABLE:', convertAvailable.rowCount);
    console.log('Converted to PAYOUT_PROCESSING:', convertProcessing.rowCount);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Module 15 migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

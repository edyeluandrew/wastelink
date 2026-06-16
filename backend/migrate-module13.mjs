import pool from './src/config/db.js';

async function migrateModule13() {
  try {
    console.log('[Module 13] Running migrations...');

    await pool.query(`
      ALTER TABLE earnings
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await pool.query(`
      ALTER TABLE earnings DROP CONSTRAINT IF EXISTS earnings_status_check
    `);

    await pool.query(`
      ALTER TABLE earnings
      ADD CONSTRAINT earnings_status_check
      CHECK (status IN ('PENDING','APPROVED','PAYOUT_INITIATED','PAID','FAILED'))
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_status_history (
        id SERIAL PRIMARY KEY,
        earning_id INT NOT NULL REFERENCES earnings(id),
        waste_log_id INT NOT NULL REFERENCES waste_logs(id),
        from_status VARCHAR(30),
        to_status VARCHAR(30) NOT NULL,
        payment_reference VARCHAR(120),
        amount INT,
        changed_by INT,
        notes TEXT,
        is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('[Module 13] Migrations complete.');
    process.exit(0);
  } catch (error) {
    console.error('[Module 13 Migration Error]', error.message);
    process.exit(1);
  }
}

migrateModule13();

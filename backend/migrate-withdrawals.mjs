import pool from './src/config/db.js';

async function migrateWithdrawals() {
  try {
    console.log('[Withdrawals] Running migration...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        picker_id INT NOT NULL REFERENCES pickers(id),
        provider VARCHAR(20) NOT NULL CHECK (provider IN ('MTN','AIRTEL')),
        phone VARCHAR(30) NOT NULL,
        amount INT NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'UGX',
        status VARCHAR(20) NOT NULL CHECK (status IN ('PROCESSING','SUCCESS','FAILED','CANCELLED')),
        payment_reference VARCHAR(120),
        is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
        failure_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_request_earnings (
        id SERIAL PRIMARY KEY,
        withdrawal_request_id INT NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
        earning_id INT NOT NULL REFERENCES earnings(id),
        waste_log_id INT NOT NULL REFERENCES waste_logs(id),
        amount INT NOT NULL,
        UNIQUE(withdrawal_request_id, earning_id)
      )
    `);

    console.log('[Withdrawals] Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('[Withdrawals Migration Error]', error.message);
    process.exit(1);
  }
}

migrateWithdrawals();

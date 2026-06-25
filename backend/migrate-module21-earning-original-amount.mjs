import pool from './src/config/db.js';
import { ensureWithdrawalTables } from './src/services/payment/withdrawalService.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureWithdrawalTables(client);

    await client.query(`
      ALTER TABLE earnings
      ADD COLUMN IF NOT EXISTS original_amount INT
    `);

    await client.query(`
      UPDATE earnings
      SET original_amount = amount
      WHERE original_amount IS NULL
    `);

    await client.query(`
      UPDATE earnings e
      SET original_amount = e.amount + withdrawn.total
      FROM (
        SELECT
          wre.earning_id,
          COALESCE(SUM(wre.amount), 0) AS total
        FROM withdrawal_request_earnings wre
        JOIN withdrawal_requests wr ON wr.id = wre.withdrawal_request_id
        WHERE wr.status = 'SUCCESS'
        GROUP BY wre.earning_id
      ) withdrawn
      WHERE e.id = withdrawn.earning_id
        AND e.original_amount = e.amount
        AND withdrawn.total > 0
    `);

    await client.query('COMMIT');
    console.log('Module 21 migration completed — earnings.original_amount backfilled.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Module 21 migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

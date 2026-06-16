import dotenv from 'dotenv';
import pool from '../config/db.js';
import { calculateEarnings } from '../utils/calculateEarnings.js';

dotenv.config();

const id = Number(process.argv[2] || 27);
const commit = process.argv.includes('--commit');

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const wasteLogResult = await client.query(
    'SELECT id, status, waste_type, picker_id, job_code, collection_point_id, estimated_kg FROM waste_logs WHERE id = $1 FOR UPDATE',
    [id]
  );
  const wasteLog = wasteLogResult.rows[0];
  console.log('log', wasteLog);

  const updateResult = await client.query(
    `UPDATE waste_logs 
     SET verified_kg = $1, status = 'VERIFIED', verified_at = NOW(), updated_at = NOW(),
         notes = CASE WHEN $2::text IS NOT NULL AND TRIM($2::text) != '' THEN $2::text ELSE notes END
     WHERE id = $3
     RETURNING id, job_code, waste_type, estimated_kg, verified_kg, picker_id`,
    [4.5, null, id]
  );

  const { ratePerKg, amount } = calculateEarnings(wasteLog.waste_type, 4.5);
  const earningResult = await client.query(
    `INSERT INTO earnings (picker_id, waste_log_id, rate_per_kg, amount, status)
     VALUES ($1, $2, $3, $4, 'PENDING') RETURNING *`,
    [wasteLog.picker_id, id, ratePerKg, amount]
  );

  if (commit) {
    await client.query('COMMIT');
    console.log('COMMITTED verify for', updateResult.rows[0].job_code);
    console.log('estimated_kg', updateResult.rows[0].estimated_kg, 'verified_kg', updateResult.rows[0].verified_kg);
    console.log('earning', earningResult.rows[0]);
  } else {
    await client.query('ROLLBACK');
    console.log('OK (rolled back)');
  }
} catch (e) {
  await client.query('ROLLBACK');
  console.error('ERROR', e.code, e.message);
} finally {
  client.release();
  await pool.end();
}

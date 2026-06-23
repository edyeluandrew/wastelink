/**
 * Wipe operational + config data; keep SUPER_ADMIN users and reporting categories.
 * Run: node src/scripts/resetDbKeepSuperAdmin.mjs
 * Requires DATABASE_URL in backend/.env
 */
import dotenv from 'dotenv';
import pool from '../config/db.js';
import { ensureDefaultReportingCategories } from '../services/wasteTypeGovernanceService.js';

dotenv.config();

const optionalDelete = async (client, sql) => {
  try {
    const result = await client.query(sql);
    const match = sql.match(/FROM\s+([a-z_]+)/i);
    const table = match?.[1] || 'table';
    console.log(`  cleared ${table}: ${result.rowCount ?? 0} rows`);
  } catch (error) {
    if (error.code === '42P01') {
      console.log(`  skipped (table missing): ${sql.match(/FROM\s+([a-z_]+)/i)?.[1]}`);
      return;
    }
    throw error;
  }
};

const run = async () => {
  const client = await pool.connect();

  try {
    const before = await client.query(
      `SELECT id, email, name, role FROM users WHERE role = 'SUPER_ADMIN' ORDER BY id`
    );

    if (before.rows.length === 0) {
      console.error('ABORT: No SUPER_ADMIN user found. Create one before wiping the database.');
      process.exitCode = 1;
      return;
    }

    console.log('Keeping SUPER_ADMIN account(s):');
    before.rows.forEach((row) => console.log(`  - ${row.email || row.name} (id ${row.id})`));
    console.log('\nWiping data...\n');

    await client.query('BEGIN');

    await optionalDelete(client, 'DELETE FROM recycler_audit_logs');
    await optionalDelete(client, 'DELETE FROM recycler_payments');
    await optionalDelete(client, 'DELETE FROM recycler_purchase_requests');
    await optionalDelete(client, 'DELETE FROM waste_batch_items');
    await optionalDelete(client, 'DELETE FROM waste_sale_batches');
    await optionalDelete(client, 'DELETE FROM recycler_accepted_waste_types');

    await optionalDelete(client, 'DELETE FROM withdrawal_request_earnings');
    await optionalDelete(client, 'DELETE FROM withdrawal_requests');
    await optionalDelete(client, 'DELETE FROM payment_status_history');
    await optionalDelete(client, 'DELETE FROM payout_transactions');

    await optionalDelete(client, 'DELETE FROM earnings');
    await optionalDelete(client, 'DELETE FROM waste_logs');

    await optionalDelete(client, 'DELETE FROM city_waste_type_history');
    await optionalDelete(client, 'DELETE FROM city_waste_types');
    // reporting_categories kept — default waste categories for demo setup

    await optionalDelete(client, 'DELETE FROM city_divisions');
    await optionalDelete(client, 'DELETE FROM cities');

    await client.query(`
      UPDATE users
      SET picker_id = NULL,
          recycler_id = NULL,
          collection_point_id = NULL,
          city = NULL,
          division = NULL
    `);

    const removedUsers = await client.query(
      `DELETE FROM users WHERE role <> 'SUPER_ADMIN' RETURNING id, email, role`
    );
    console.log(`  removed non-super-admin users: ${removedUsers.rowCount}`);

    await optionalDelete(client, 'DELETE FROM pickers');
    await optionalDelete(client, 'DELETE FROM recyclers');
    await optionalDelete(client, 'DELETE FROM collection_points');

    await client.query('COMMIT');

    await ensureDefaultReportingCategories();
    const categories = await pool.query(
      'SELECT id, name, slug FROM reporting_categories ORDER BY name'
    );

    const after = await client.query(
      `SELECT id, email, name, role, status FROM users ORDER BY id`
    );

    console.log('\nDone. Remaining users:');
    after.rows.forEach((row) =>
      console.log(`  - [${row.role}] ${row.email || row.name} (id ${row.id}, ${row.status})`
      )
    );
    console.log(`\nReporting categories (${categories.rows.length}):`);
    categories.rows.forEach((row) => console.log(`  - ${row.name} (${row.slug})`));
    console.log('\nReady for demo: log in as super admin, add city, waste types, collection points, users.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset failed — rolled back:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

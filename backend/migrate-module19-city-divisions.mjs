/**
 * City divisions — admin-managed areas per municipality.
 * Run: node migrate-module19-city-divisions.mjs
 */
import pool from './src/config/db.js';

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS city_divisions (
        id SERIAL PRIMARY KEY,
        city VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'INACTIVE')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (city, slug)
      )
    `);

    await client.query(`
      ALTER TABLE collection_points
        ADD COLUMN IF NOT EXISTS city VARCHAR(100)
    `);

    await client.query(`
      UPDATE collection_points
      SET city = LOWER(COALESCE(NULLIF(TRIM(city), ''), $1))
      WHERE city IS NULL OR TRIM(city) = ''
    `, [process.env.DEFAULT_CITY || 'mbarara']);

    await client.query('COMMIT');
    console.log('[Module 19] city_divisions migration completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Module 19] Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

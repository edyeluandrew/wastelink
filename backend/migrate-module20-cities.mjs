/**
 * Pilot cities — admin-managed municipalities for multi-city rollout.
 * Run: node migrate-module20-cities.mjs
 */
import pool from './src/config/db.js';

const defaultSlug = String(process.env.DEFAULT_CITY || 'mbarara').trim().toLowerCase();
const defaultName = defaultSlug
  .split(/[\s_-]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'INACTIVE')),
        is_pilot BOOLEAN NOT NULL DEFAULT TRUE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (slug)
      )
    `);

    await client.query(
      `INSERT INTO cities (name, slug, status, is_pilot, is_default)
       VALUES ($1, $2, 'ACTIVE', TRUE, TRUE)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         is_pilot = TRUE,
         is_default = TRUE,
         updated_at = NOW()`,
      [defaultName, defaultSlug]
    );

    await client.query(`
      UPDATE cities SET is_default = FALSE WHERE slug != $1 AND is_default = TRUE
    `, [defaultSlug]);

    await client.query('COMMIT');
    console.log('[Module 20] cities migration completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Module 20] Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

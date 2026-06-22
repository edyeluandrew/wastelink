/**
 * Module 18 — Recycler inventory grouping, reservations, accepted waste types
 * Run: node migrate-module18-recycler-inventory.mjs
 */
import pool from './src/config/db.js';

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE waste_sale_batches
        ADD COLUMN IF NOT EXISTS reserved_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sold_kg NUMERIC(12,2) NOT NULL DEFAULT 0
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recycler_accepted_waste_types (
        id SERIAL PRIMARY KEY,
        recycler_id INT NOT NULL REFERENCES recyclers(id) ON DELETE CASCADE,
        city_waste_type_id INT REFERENCES city_waste_types(id) ON DELETE CASCADE,
        waste_type_name VARCHAR(150),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (recycler_id, city_waste_type_id)
      )
    `);

    await client.query(`
      ALTER TABLE recycler_purchase_requests
        ADD COLUMN IF NOT EXISTS recycler_note TEXT,
        ADD COLUMN IF NOT EXISTS collection_point_id INT REFERENCES collection_points(id),
        ADD COLUMN IF NOT EXISTS city_waste_type_id INT REFERENCES city_waste_types(id),
        ADD COLUMN IF NOT EXISTS price_per_kg_snapshot NUMERIC(12,2)
    `);

    await client.query(`
      UPDATE waste_sale_batches SET status = 'RESERVED_PENDING_APPROVAL'
      WHERE status = 'PURCHASE_REQUESTED'
    `);

    await client.query(`
      ALTER TABLE waste_sale_batches DROP CONSTRAINT IF EXISTS waste_sale_batches_status_check
    `);
    await client.query(`
      ALTER TABLE waste_sale_batches ADD CONSTRAINT waste_sale_batches_status_check
      CHECK (status IN (
        'AVAILABLE','RESERVED_PENDING_APPROVAL','RESERVED','PICKUP_SCHEDULED',
        'PICKED_UP','SOLD','CANCELLED','PURCHASE_REQUESTED'
      ))
    `);

    // Backfill accepted waste types from legacy text field
    const recyclers = await client.query(
      `SELECT id, city, waste_types_accepted FROM recyclers WHERE waste_types_accepted IS NOT NULL`
    );
    for (const row of recyclers.rows) {
      const parts = String(row.waste_types_accepted)
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const part of parts) {
        const match = await client.query(
          `SELECT id FROM city_waste_types
           WHERE LOWER(city) = LOWER($1)
             AND (
               LOWER(name) = LOWER($2)
               OR LOWER(slug) = LOWER($2)
               OR LOWER(slug) = LOWER(REPLACE($2, ' ', '-'))
             )
           LIMIT 1`,
          [String(row.city || 'kampala'), String(part)]
        );
        if (match.rows[0]?.id) {
          await client.query(
            `INSERT INTO recycler_accepted_waste_types (recycler_id, city_waste_type_id, waste_type_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (recycler_id, city_waste_type_id) DO NOTHING`,
            [row.id, match.rows[0].id, String(part)]
          );
        } else {
          const exists = await client.query(
            `SELECT id FROM recycler_accepted_waste_types
             WHERE recycler_id = $1 AND LOWER(waste_type_name) = LOWER($2) LIMIT 1`,
            [row.id, String(part)]
          );
          if (exists.rows.length === 0) {
            await client.query(
              `INSERT INTO recycler_accepted_waste_types (recycler_id, waste_type_name) VALUES ($1, $2)`,
              [row.id, String(part)]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('[Module 18] Recycler inventory migration completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Module 18] Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

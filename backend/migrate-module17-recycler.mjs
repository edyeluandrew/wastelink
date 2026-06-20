/**
 * Module 17 — Recycler dashboard, sale batches, purchase requests
 * Run: node migrate-module17-recycler.mjs
 */
import pool from './src/config/db.js';

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS recyclers (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(150),
        location VARCHAR(200),
        waste_types_accepted TEXT,
        buying_capacity_kg_week NUMERIC(12,2),
        buying_capacity_kg_month NUMERIC(12,2),
        city VARCHAR(100) DEFAULT 'kampala',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE','INACTIVE')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS recycler_id INT REFERENCES recyclers(id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS waste_sale_batches (
        id SERIAL PRIMARY KEY,
        batch_code VARCHAR(30) UNIQUE NOT NULL,
        waste_type VARCHAR(100) NOT NULL,
        city_waste_type_id INT REFERENCES city_waste_types(id),
        city VARCHAR(100) NOT NULL DEFAULT 'kampala',
        collection_point_id INT NOT NULL REFERENCES collection_points(id),
        verified_kg NUMERIC(12,2) NOT NULL CHECK (verified_kg > 0),
        available_kg NUMERIC(12,2) NOT NULL CHECK (available_kg >= 0),
        picker_price_per_kg_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0,
        recycler_sale_price_per_kg NUMERIC(12,2) NOT NULL CHECK (recycler_sale_price_per_kg >= 0),
        expected_total_amount INT NOT NULL DEFAULT 0,
        final_pickup_kg NUMERIC(12,2),
        final_total_amount INT,
        status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE'
          CHECK (status IN ('AVAILABLE','RESERVED','PURCHASE_REQUESTED','PICKUP_SCHEDULED','PICKED_UP','SOLD','CANCELLED')),
        created_by_admin_id INT REFERENCES users(id),
        assigned_recycler_id INT REFERENCES recyclers(id),
        pickup_date TIMESTAMPTZ,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (payment_status IN ('PENDING','RECEIVED')),
        payment_reference VARCHAR(120),
        quality_notes TEXT,
        pickup_instructions TEXT,
        admin_notes TEXT,
        price_override_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS waste_batch_items (
        id SERIAL PRIMARY KEY,
        batch_id INT NOT NULL REFERENCES waste_sale_batches(id) ON DELETE CASCADE,
        waste_log_id INT NOT NULL REFERENCES waste_logs(id),
        kg_allocated NUMERIC(12,2) NOT NULL CHECK (kg_allocated > 0),
        UNIQUE(batch_id, waste_log_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recycler_purchase_requests (
        id SERIAL PRIMARY KEY,
        request_code VARCHAR(30) UNIQUE NOT NULL,
        batch_id INT NOT NULL REFERENCES waste_sale_batches(id),
        recycler_id INT NOT NULL REFERENCES recyclers(id),
        requested_kg NUMERIC(12,2) NOT NULL CHECK (requested_kg > 0),
        expected_amount INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED')),
        admin_response TEXT,
        rejection_reason TEXT,
        pickup_date TIMESTAMPTZ,
        final_kg NUMERIC(12,2),
        final_amount INT,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recycler_payments (
        id SERIAL PRIMARY KEY,
        purchase_request_id INT REFERENCES recycler_purchase_requests(id),
        batch_id INT NOT NULL REFERENCES waste_sale_batches(id),
        recycler_id INT NOT NULL REFERENCES recyclers(id),
        amount INT NOT NULL CHECK (amount > 0),
        payment_method VARCHAR(50) NOT NULL,
        payment_reference VARCHAR(120),
        recorded_by_admin_id INT REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recycler_audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(80) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        admin_id INT REFERENCES users(id),
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('SUPER_ADMIN','CITY_ADMIN','AGENT','PICKER','RECYCLER'))
    `);

    await client.query('COMMIT');
    console.log('[Module 17] Recycler module migration completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Module 17] Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

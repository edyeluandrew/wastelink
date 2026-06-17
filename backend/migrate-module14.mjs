import pool from './src/config/db.js';

const REPORTING_CATEGORIES = [
  { name: 'Plastic', slug: 'plastic', description: 'Plastic and polythene materials' },
  { name: 'Paper/Cardboard', slug: 'paper-cardboard', description: 'Paper and cardboard recyclables' },
  { name: 'Metal', slug: 'metal', description: 'Metal scrap and cans' },
  { name: 'Glass', slug: 'glass', description: 'Glass bottles and containers' },
  { name: 'Organic', slug: 'organic', description: 'Organic and compostable waste' },
  { name: 'E-waste', slug: 'e-waste', description: 'Electronic waste' },
  { name: 'Textile', slug: 'textile', description: 'Textile and fabric waste' },
  { name: 'Other', slug: 'other', description: 'Other recyclable or tracked materials' },
];

const KAMPALA_CITY_WASTE_TYPES = [
  { name: 'PET Bottles', slug: 'pet-bottles', category: 'plastic', price_per_kg: 700, is_payable: true },
  { name: 'Hard Plastics', slug: 'hard-plastics', category: 'plastic', price_per_kg: 900, is_payable: true },
  { name: 'Kaveera / Polythene', slug: 'kaveera-polythene', category: 'plastic', price_per_kg: 300, is_payable: true },
  { name: 'Paper/Cardboard', slug: 'paper-cardboard', category: 'paper-cardboard', price_per_kg: 400, is_payable: true },
  { name: 'Metal Scrap', slug: 'metal-scrap', category: 'metal', price_per_kg: 1000, is_payable: true },
  { name: 'Glass', slug: 'glass', category: 'glass', price_per_kg: 100, is_payable: true },
  { name: 'Organic Waste', slug: 'organic-waste', category: 'organic', price_per_kg: 0, is_payable: false },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS reporting_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(120) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS city_waste_types (
        id SERIAL PRIMARY KEY,
        city VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) NOT NULL,
        description TEXT,
        reporting_category_id INT NOT NULL REFERENCES reporting_categories(id),
        unit VARCHAR(20) NOT NULL DEFAULT 'kg',
        price_per_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
        is_payable BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT REFERENCES users(id),
        updated_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (city, slug)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS city_waste_type_history (
        id SERIAL PRIMARY KEY,
        city_waste_type_id INT NOT NULL REFERENCES city_waste_types(id) ON DELETE CASCADE,
        city VARCHAR(100) NOT NULL,
        changed_by INT REFERENCES users(id),
        change_type VARCHAR(40) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      ALTER TABLE waste_logs
        ADD COLUMN IF NOT EXISTS city_waste_type_id INT REFERENCES city_waste_types(id),
        ADD COLUMN IF NOT EXISTS reporting_category_id INT REFERENCES reporting_categories(id),
        ADD COLUMN IF NOT EXISTS price_per_kg_snapshot NUMERIC(12, 2),
        ADD COLUMN IF NOT EXISTS is_payable_snapshot BOOLEAN
    `);

    await client.query(`
      ALTER TABLE earnings
        ADD COLUMN IF NOT EXISTS city_waste_type_id INT REFERENCES city_waste_types(id),
        ADD COLUMN IF NOT EXISTS reporting_category_id INT REFERENCES reporting_categories(id)
    `);

    const categoryIds = {};
    for (const cat of REPORTING_CATEGORIES) {
      const result = await client.query(
        `INSERT INTO reporting_categories (name, slug, description, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           updated_at = NOW()
         RETURNING id, slug`,
        [cat.name, cat.slug, cat.description]
      );
      categoryIds[result.rows[0].slug] = result.rows[0].id;
    }

    for (const item of KAMPALA_CITY_WASTE_TYPES) {
      const reportingCategoryId = categoryIds[item.category];
      if (!reportingCategoryId) continue;

      await client.query(
        `INSERT INTO city_waste_types (
          city, name, slug, description, reporting_category_id,
          unit, price_per_kg, is_payable, is_active
        ) VALUES ($1, $2, $3, $4, $5, 'kg', $6, $7, TRUE)
        ON CONFLICT (city, slug) DO UPDATE SET
          name = EXCLUDED.name,
          reporting_category_id = EXCLUDED.reporting_category_id,
          price_per_kg = EXCLUDED.price_per_kg,
          is_payable = EXCLUDED.is_payable,
          is_active = TRUE,
          updated_at = NOW()`,
        [
          'kampala',
          item.name,
          item.slug,
          `${item.name} — Kampala city waste type`,
          reportingCategoryId,
          item.price_per_kg,
          item.is_payable,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Module 14 migration completed.');
    console.log('Reporting categories:', Object.keys(categoryIds).length);
    console.log('Kampala city waste types seeded:', KAMPALA_CITY_WASTE_TYPES.length);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Module 14 migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

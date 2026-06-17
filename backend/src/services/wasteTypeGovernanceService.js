import pool from '../config/db.js';
import { normalizeCity, slugify } from '../utils/cityScope.js';

const mapCityWasteTypeRow = (row) => ({
  id: row.id,
  city: row.city,
  name: row.name,
  slug: row.slug,
  description: row.description,
  reporting_category_id: row.reporting_category_id,
  reporting_category_name: row.reporting_category_name,
  reporting_category_slug: row.reporting_category_slug,
  unit: row.unit,
  price_per_kg: parseFloat(row.price_per_kg),
  is_payable: row.is_payable,
  is_active: row.is_active,
  created_by: row.created_by,
  updated_by: row.updated_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const baseSelect = `
  SELECT
    cwt.*,
    rc.name AS reporting_category_name,
    rc.slug AS reporting_category_slug
  FROM city_waste_types cwt
  JOIN reporting_categories rc ON rc.id = cwt.reporting_category_id
`;

export const recordCityWasteTypeHistory = async (client, {
  cityWasteTypeId,
  city,
  changedBy,
  changeType,
  oldValues = null,
  newValues = null,
  reason = null,
}) => {
  await client.query(
    `INSERT INTO city_waste_type_history (
      city_waste_type_id, city, changed_by, change_type, old_values, new_values, reason
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [
      cityWasteTypeId,
      normalizeCity(city),
      changedBy || null,
      changeType,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      reason,
    ]
  );
};

export const listReportingCategories = async ({ activeOnly = false } = {}) => {
  const params = [];
  let query = `SELECT * FROM reporting_categories WHERE 1=1`;
  if (activeOnly) {
    query += ` AND is_active = TRUE`;
  }
  query += ` ORDER BY name ASC`;
  const result = await pool.query(query, params);
  return result.rows;
};

export const listCityWasteTypes = async ({
  city = null,
  activeOnly = false,
  includeInactive = true,
} = {}) => {
  const params = [];
  let query = `${baseSelect} WHERE 1=1`;

  if (city) {
    params.push(normalizeCity(city));
    query += ` AND cwt.city = $${params.length}`;
  }

  if (activeOnly) {
    query += ` AND cwt.is_active = TRUE AND rc.is_active = TRUE`;
  } else if (!includeInactive) {
    query += ` AND cwt.is_active = TRUE`;
  }

  query += ` ORDER BY cwt.city ASC, cwt.name ASC`;
  const result = await pool.query(query, params);
  return result.rows.map(mapCityWasteTypeRow);
};

export const getCityWasteTypeById = async (id, client = pool) => {
  const result = await client.query(`${baseSelect} WHERE cwt.id = $1 LIMIT 1`, [id]);
  return result.rows[0] ? mapCityWasteTypeRow(result.rows[0]) : null;
};

export const getActiveCityWasteTypeForLog = async (id, city, client = pool) => {
  const result = await client.query(
    `${baseSelect}
     WHERE cwt.id = $1 AND cwt.city = $2 AND cwt.is_active = TRUE AND rc.is_active = TRUE
     LIMIT 1`,
    [id, normalizeCity(city)]
  );
  return result.rows[0] ? mapCityWasteTypeRow(result.rows[0]) : null;
};

export const createCityWasteType = async ({
  city,
  name,
  description = null,
  reportingCategoryId,
  pricePerKg = 0,
  isPayable = true,
  isActive = true,
  changedBy = null,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slug = slugify(name);
    const result = await client.query(
      `INSERT INTO city_waste_types (
        city, name, slug, description, reporting_category_id,
        price_per_kg, is_payable, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *`,
      [
        normalizeCity(city),
        name.trim(),
        slug,
        description,
        reportingCategoryId,
        pricePerKg,
        isPayable,
        isActive,
        changedBy,
      ]
    );
    const created = result.rows[0];
    await recordCityWasteTypeHistory(client, {
      cityWasteTypeId: created.id,
      city: created.city,
      changedBy,
      changeType: 'CREATE',
      newValues: created,
    });
    await client.query('COMMIT');
    return getCityWasteTypeById(created.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateCityWasteType = async (id, updates, { changedBy = null, reason = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingResult = await client.query(`SELECT * FROM city_waste_types WHERE id = $1 FOR UPDATE`, [id]);
    if (existingResult.rows.length === 0) {
      const error = new Error('City waste type not found');
      error.status = 404;
      throw error;
    }
    const existing = existingResult.rows[0];

    const fields = [];
    const values = [];
    let idx = 1;

    const setField = (column, value) => {
      fields.push(`${column} = $${idx++}`);
      values.push(value);
    };

    if (updates.name !== undefined) {
      setField('name', updates.name.trim());
      setField('slug', slugify(updates.name));
    }
    if (updates.description !== undefined) setField('description', updates.description);
    if (updates.reporting_category_id !== undefined) setField('reporting_category_id', updates.reporting_category_id);
    if (updates.price_per_kg !== undefined) setField('price_per_kg', updates.price_per_kg);
    if (updates.is_payable !== undefined) setField('is_payable', updates.is_payable);
    if (updates.is_active !== undefined) setField('is_active', updates.is_active);

    setField('updated_by', changedBy);
    fields.push(`updated_at = NOW()`);

    values.push(id);
    const updateResult = await client.query(
      `UPDATE city_waste_types SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    const updated = updateResult.rows[0];

    await recordCityWasteTypeHistory(client, {
      cityWasteTypeId: id,
      city: updated.city,
      changedBy,
      changeType: updates.is_active === false ? 'DEACTIVATE' : updates.is_active === true ? 'ACTIVATE' : 'UPDATE',
      oldValues: existing,
      newValues: updated,
      reason,
    });

    await client.query('COMMIT');
    return getCityWasteTypeById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const calculateEarningFromCityWasteType = (cityWasteType, verifiedKg) => {
  const ratePerKg = cityWasteType?.is_payable ? parseFloat(cityWasteType.price_per_kg || 0) : 0;
  const amount = Math.round(ratePerKg * Number(verifiedKg || 0));
  return { ratePerKg, amount };
};

export const getCityWasteTypeHistory = async (cityWasteTypeId) => {
  const result = await pool.query(
    `SELECT h.*, u.name AS changed_by_name, u.email AS changed_by_email
     FROM city_waste_type_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.city_waste_type_id = $1
     ORDER BY h.created_at DESC`,
    [cityWasteTypeId]
  );
  return result.rows;
};

export const upsertReportingCategory = async ({ id, name, slug, description, isActive = true }) => {
  if (id) {
    const result = await pool.query(
      `UPDATE reporting_categories
       SET name = $1, slug = $2, description = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, slug || slugify(name), description, isActive, id]
    );
    return result.rows[0];
  }

  const result = await pool.query(
    `INSERT INTO reporting_categories (name, slug, description, is_active)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING *`,
    [name, slug || slugify(name), description, isActive]
  );
  return result.rows[0];
};

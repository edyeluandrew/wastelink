import pool from '../config/db.js';
import { canManageCity, normalizeCity, slugify } from '../utils/cityScope.js';

const mapCityRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: row.status,
  is_pilot: row.is_pilot,
  is_default: row.is_default,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const listCities = async ({ activeOnly = false, pilotOnly = false } = {}) => {
  const params = [];
  let query = `SELECT * FROM cities WHERE 1=1`;

  if (activeOnly) {
    query += ` AND status = 'ACTIVE'`;
  }
  if (pilotOnly) {
    query += ` AND is_pilot = TRUE`;
  }

  query += ` ORDER BY is_default DESC, name ASC`;
  const result = await pool.query(query, params);
  return result.rows.map(mapCityRow);
};

export const getCityById = async (id) => {
  const result = await pool.query(`SELECT * FROM cities WHERE id = $1`, [id]);
  return result.rows[0] ? mapCityRow(result.rows[0]) : null;
};

export const getCityBySlug = async (slug) => {
  const result = await pool.query(
    `SELECT * FROM cities WHERE LOWER(slug) = LOWER($1) LIMIT 1`,
    [normalizeCity(slug)]
  );
  return result.rows[0] ? mapCityRow(result.rows[0]) : null;
};

export const getDefaultCityRecord = async () => {
  const envDefault = normalizeCity(process.env.DEFAULT_CITY || 'mbarara');

  const flagged = await pool.query(
    `SELECT * FROM cities
     WHERE status = 'ACTIVE' AND is_default = TRUE
     ORDER BY name ASC
     LIMIT 1`
  );
  if (flagged.rows[0]) {
    return mapCityRow(flagged.rows[0]);
  }

  const envMatch = await pool.query(
    `SELECT * FROM cities
     WHERE status = 'ACTIVE' AND LOWER(slug) = LOWER($1)
     LIMIT 1`,
    [envDefault]
  );
  if (envMatch.rows[0]) {
    return mapCityRow(envMatch.rows[0]);
  }

  const result = await pool.query(
    `SELECT * FROM cities
     WHERE status = 'ACTIVE'
     ORDER BY is_pilot DESC, name ASC
     LIMIT 1`
  );
  if (result.rows[0]) {
    return mapCityRow(result.rows[0]);
  }

  return {
    id: null,
    name: 'Mbarara',
    slug: envDefault,
    status: 'ACTIVE',
    is_pilot: true,
    is_default: true,
  };
};

export const listCitySlugs = async ({ activeOnly = true } = {}) => {
  const cities = await listCities({ activeOnly });
  return cities.map((city) => city.slug);
};

export const createCity = async ({ name, slug, isPilot = true, isDefault = false }) => {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw Object.assign(new Error('City name is required'), { status: 400 });
  }

  const normalizedSlug = slug ? normalizeCity(slug) : slugify(trimmedName);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    if (isDefault) {
      await client.query(`UPDATE cities SET is_default = FALSE, updated_at = NOW()`);
    }

    const result = await client.query(
      `INSERT INTO cities (name, slug, status, is_pilot, is_default)
       VALUES ($1, $2, 'ACTIVE', $3, $4)
       RETURNING *`,
      [trimmedName, normalizedSlug, Boolean(isPilot), Boolean(isDefault)]
    );

    await client.query('COMMIT');
    return mapCityRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateCity = async (id, { name, status, isPilot, isDefault }) => {
  const existing = await getCityById(id);
  if (!existing) {
    throw Object.assign(new Error('City not found'), { status: 404 });
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) {
    const trimmedName = String(name).trim();
    if (!trimmedName) {
      throw Object.assign(new Error('City name is required'), { status: 400 });
    }
    updates.push(`name = $${idx++}`);
    params.push(trimmedName);
  }
  if (status !== undefined) {
    updates.push(`status = $${idx++}`);
    params.push(status);
  }
  if (isPilot !== undefined) {
    updates.push(`is_pilot = $${idx++}`);
    params.push(Boolean(isPilot));
  }
  if (isDefault !== undefined && isDefault) {
    await pool.query(`UPDATE cities SET is_default = FALSE, updated_at = NOW()`);
    updates.push(`is_default = TRUE`);
  } else if (isDefault === false) {
    updates.push(`is_default = FALSE`);
  }

  if (!updates.length) {
    throw Object.assign(new Error('No fields to update'), { status: 400 });
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  const result = await pool.query(
    `UPDATE cities SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return mapCityRow(result.rows[0]);
};

export const assertCityExists = async (slug) => {
  const city = await getCityBySlug(slug);
  if (!city || city.status !== 'ACTIVE') {
    throw Object.assign(
      new Error(`City "${slug}" is not configured or inactive. Add it under Cities first.`),
      { status: 400 }
    );
  }
  return city;
};

export const resolveCityListScope = (req, requestedCity) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return requestedCity ? normalizeCity(requestedCity) : null;
  }
  if (req.user?.role === 'CITY_ADMIN') {
    const city = normalizeCity(req.user?.city || process.env.DEFAULT_CITY || 'mbarara');
    if (requestedCity && normalizeCity(requestedCity) !== city) {
      throw Object.assign(new Error('Forbidden: cannot view another city'), { status: 403 });
    }
    return city;
  }
  return null;
};

export const assertCanManageCityRecord = (user) => {
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw Object.assign(new Error('Forbidden: only super admin can manage cities'), { status: 403 });
  }
};

import pool from '../config/db.js';
import { canManageCity, normalizeCity, resolveUserCity, slugify } from '../utils/cityScope.js';

export const listCityDivisions = async ({ city, activeOnly = false } = {}) => {
  const params = [normalizeCity(city)];
  let query = `
    SELECT id, city, name, slug, status, created_at, updated_at
    FROM city_divisions
    WHERE LOWER(city) = LOWER($1)
  `;
  if (activeOnly) {
    query += ` AND status = 'ACTIVE'`;
  }
  query += ' ORDER BY name ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

export const getCityDivisionById = async (id) => {
  const result = await pool.query(`SELECT * FROM city_divisions WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

export const findCityDivisionByName = async (city, name) => {
  const result = await pool.query(
    `SELECT * FROM city_divisions
     WHERE LOWER(city) = LOWER($1) AND LOWER(TRIM(name)) = LOWER(TRIM($2))
     LIMIT 1`,
    [normalizeCity(city), String(name || '').trim()]
  );
  return result.rows[0] || null;
};

export const createCityDivision = async ({ city, name }) => {
  const normalizedCity = normalizeCity(city);
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw Object.assign(new Error('Division name is required'), { status: 400 });
  }

  const slug = slugify(trimmedName);
  const result = await pool.query(
    `INSERT INTO city_divisions (city, name, slug, status)
     VALUES ($1, $2, $3, 'ACTIVE')
     RETURNING id, city, name, slug, status, created_at, updated_at`,
    [normalizedCity, trimmedName, slug]
  );
  return result.rows[0];
};

export const updateCityDivision = async (id, { name, status }) => {
  const existing = await getCityDivisionById(id);
  if (!existing) {
    throw Object.assign(new Error('Division not found'), { status: 404 });
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) {
    const trimmedName = String(name).trim();
    if (!trimmedName) {
      throw Object.assign(new Error('Division name is required'), { status: 400 });
    }
    updates.push(`name = $${idx++}`);
    params.push(trimmedName);
    updates.push(`slug = $${idx++}`);
    params.push(slugify(trimmedName));
  }
  if (status !== undefined) {
    updates.push(`status = $${idx++}`);
    params.push(status);
  }

  if (!updates.length) {
    throw Object.assign(new Error('No fields to update'), { status: 400 });
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  const result = await pool.query(
    `UPDATE city_divisions SET ${updates.join(', ')} WHERE id = $${idx}
     RETURNING id, city, name, slug, status, created_at, updated_at`,
    params
  );
  return result.rows[0];
};

export const assertDivisionExistsForCity = async (city, divisionName) => {
  const division = await findCityDivisionByName(city, divisionName);
  if (!division || division.status !== 'ACTIVE') {
    throw Object.assign(
      new Error(`Division "${divisionName}" is not configured for ${normalizeCity(city)}. Create it under Divisions first.`),
      { status: 400 }
    );
  }
  return division;
};

export const resolveDivisionListCity = (req, requestedCity) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return normalizeCity(requestedCity || process.env.DEFAULT_CITY || 'mbarara');
  }
  if (req.user?.role === 'CITY_ADMIN') {
    const city = resolveUserCity(req.user);
    if (requestedCity && normalizeCity(requestedCity) !== city) {
      throw Object.assign(new Error('Forbidden: cannot view divisions for another city'), { status: 403 });
    }
    return city;
  }
  return normalizeCity(requestedCity || process.env.DEFAULT_CITY || 'mbarara');
};

export const assertCanManageDivisionCity = (user, city) => {
  if (!canManageCity(user, city)) {
    throw Object.assign(new Error('Forbidden: cannot manage divisions for this city'), { status: 403 });
  }
};

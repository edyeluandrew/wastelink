import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  listCityDivisions,
  createCityDivision,
  updateCityDivision,
  getCityDivisionById,
  resolveDivisionListCity,
  assertCanManageDivisionCity,
} from '../services/divisionService.js';
import { getDefaultCityRecord } from '../services/cityService.js';
import pool from '../config/db.js';
import { normalizeCity } from '../utils/cityScope.js';

export const getDivisions = async (req, res, next) => {
  try {
    const city = resolveDivisionListCity(req, req.query.city);
    const activeOnly = ['1', 'true', 'yes'].includes(String(req.query.active_only || '').toLowerCase());
    const divisions = await listCityDivisions({ city, activeOnly });
    sendSuccess(res, 'Divisions loaded', { city, divisions });
  } catch (error) {
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

export const getPublicDivisions = async (req, res, next) => {
  try {
    const city = req.query.city
      ? normalizeCity(req.query.city)
      : (await getDefaultCityRecord()).slug;
    const divisions = await listCityDivisions({ city, activeOnly: true });
    sendSuccess(res, 'Active divisions loaded', {
      city,
      divisions: divisions.map((d) => ({ id: d.id, name: d.name })),
    });
  } catch (error) {
    next(error);
  }
};

export const createDivision = async (req, res, next) => {
  try {
    const city = resolveDivisionListCity(req, req.body.city || req.query.city);
    assertCanManageDivisionCity(req.user, city);

    const division = await createCityDivision({ city, name: req.body.name });
    sendSuccess(res, 'Division created', { division }, 201);
  } catch (error) {
    if (error.code === '23505') return sendError(res, 'A division with this name already exists in this city', 409);
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

export const updateDivision = async (req, res, next) => {
  try {
    const existing = await getCityDivisionById(parseInt(req.params.id, 10));
    if (!existing) return sendError(res, 'Division not found', 404);

    assertCanManageDivisionCity(req.user, existing.city);

    const division = await updateCityDivision(existing.id, {
      name: req.body.name,
      status: req.body.status,
    });
    sendSuccess(res, 'Division updated', { division });
  } catch (error) {
    if (error.code === '23505') return sendError(res, 'A division with this name already exists in this city', 409);
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

export const getDivisionStats = async (req, res, next) => {
  try {
    const city = resolveDivisionListCity(req, req.query.city);

    const result = await pool.query(
      `SELECT
         cd.id,
         cd.name AS division,
         cd.status,
         COUNT(DISTINCT p.id) AS total_pickers,
         COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END) AS active_pickers,
         COUNT(DISTINCT cp.id) AS collection_points,
         COUNT(wl.id) AS total_logs,
         COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) AS pending_logs,
         COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) AS verified_logs,
         COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) AS rejected_logs,
         COUNT(CASE WHEN wl.status = 'PAID' THEN 1 END) AS paid_logs,
         COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) AS total_verified_kg,
         COALESCE(SUM(e.amount), 0) AS total_earnings
       FROM city_divisions cd
       LEFT JOIN collection_points cp
         ON LOWER(cp.division) = LOWER(cd.name)
        AND LOWER(COALESCE(cp.city, cd.city)) = LOWER(cd.city)
       LEFT JOIN pickers p ON LOWER(p.division) = LOWER(cd.name)
       LEFT JOIN waste_logs wl ON wl.collection_point_id = cp.id
       LEFT JOIN earnings e ON e.waste_log_id = wl.id
       WHERE LOWER(cd.city) = LOWER($1)
       GROUP BY cd.id, cd.name, cd.status
       ORDER BY cd.name ASC`,
      [city]
    );

    const divisions = result.rows.map((row) => ({
      id: row.id,
      division: row.division,
      status: row.status,
      total_pickers: parseInt(row.total_pickers, 10),
      active_pickers: parseInt(row.active_pickers, 10),
      collection_points: parseInt(row.collection_points, 10),
      total_logs: parseInt(row.total_logs, 10),
      pending_logs: parseInt(row.pending_logs, 10),
      verified_logs: parseInt(row.verified_logs, 10),
      rejected_logs: parseInt(row.rejected_logs, 10),
      paid_logs: parseInt(row.paid_logs, 10),
      total_verified_kg: parseFloat(row.total_verified_kg),
      total_earnings: parseInt(row.total_earnings, 10),
    }));

    sendSuccess(res, 'Division statistics fetched successfully', { city, divisions });
  } catch (error) {
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

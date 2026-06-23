import pool from "../config/db.js";
import { generateCollectionPointCode } from "../utils/generateCodes.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { normalizeCity, resolveUserCity } from "../utils/cityScope.js";
import { assertDivisionExistsForCity } from "../services/divisionService.js";

const defaultCity = () => normalizeCity(process.env.DEFAULT_CITY || 'mbarara');

const resolvePointCity = (req, bodyCity) => {
  if (req.user?.role === 'CITY_ADMIN') {
    return resolveUserCity(req.user);
  }
  if (req.user?.role === 'SUPER_ADMIN') {
    return normalizeCity(bodyCity || defaultCity());
  }
  return normalizeCity(bodyCity || defaultCity());
};

// POST /api/collection-points - Create a new collection point
export const createCollectionPoint = async (req, res, next) => {
  try {
    const { name, division, agent_name, agent_phone, status, city } = req.body;
    const pointCity = resolvePointCity(req, city);

    // Validate required fields
    if (!name || !division) {
      return sendError(
        res,
        "Missing required fields: name, division",
        400
      );
    }

    await assertDivisionExistsForCity(pointCity, division);

    const resolvedAgentName = agent_name ? String(agent_name).trim() : null;
    const resolvedAgentPhone = agent_phone ? String(agent_phone).trim() : null;

    // Check for duplicate agent_phone only when provided
    if (resolvedAgentPhone) {
      const phoneCheck = await pool.query(
        "SELECT id FROM collection_points WHERE agent_phone = $1",
        [resolvedAgentPhone]
      );
      if (phoneCheck.rows.length > 0) {
        return sendError(res, "Agent phone number already registered", 400);
      }
    }

    // Generate point code
    const pointCode = generateCollectionPointCode();

    // Insert collection point
    const result = await pool.query(
      `INSERT INTO collection_points (point_code, name, division, city, agent_name, agent_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, point_code, name, division, city, agent_name, agent_phone, status, created_at`,
      [pointCode, name, division, pointCity, resolvedAgentName, resolvedAgentPhone, status || "ACTIVE"]
    );

    sendSuccess(res, "Collection point created successfully", result.rows[0], 201);
  } catch (error) {
    console.error("[Collection Point Create Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/collection-points - List all collection points with optional filters
export const getCollectionPoints = async (req, res, next) => {
  try {
    const { division, status, city } = req.query;

    let query = "SELECT id, point_code, name, division, city, agent_name, agent_phone, status, created_at FROM collection_points WHERE 1=1";
    const params = [];

    const scopedCity = city || (req.user?.role === 'CITY_ADMIN' ? resolveUserCity(req.user) : null);
    if (scopedCity) {
      params.push(normalizeCity(scopedCity));
      query += ` AND LOWER(COALESCE(city, '')) = LOWER($${params.length})`;
    }

    if (division) {
      query += ` AND division = $${params.length + 1}`;
      params.push(division);
    }
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    sendSuccess(res, "Collection points retrieved successfully", result.rows);
  } catch (error) {
    console.error("[Collection Points List Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/collection-points/:id - Get a collection point by ID with summary stats
export const getCollectionPointById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get collection point details
    const pointResult = await pool.query(
      "SELECT id, point_code, name, division, agent_name, agent_phone, status, created_at, updated_at FROM collection_points WHERE id = $1",
      [id]
    );

    if (pointResult.rows.length === 0) {
      return sendError(res, "Collection point not found", 404);
    }

    const collectionPoint = pointResult.rows[0];

    // Get summary stats from waste_logs
    const statsResult = await pool.query(
      `SELECT
        COALESCE(SUM(verified_kg), 0) as total_verified_kg,
        COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) as total_jobs_verified,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as total_pending_jobs,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as total_rejected_jobs
       FROM waste_logs
       WHERE collection_point_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0] || {
      total_verified_kg: 0,
      total_jobs_verified: 0,
      total_pending_jobs: 0,
      total_rejected_jobs: 0,
    };

    const pointData = {
      ...collectionPoint,
      summary: {
        total_verified_kg: parseFloat(stats.total_verified_kg),
        total_jobs_verified: parseInt(stats.total_jobs_verified),
        total_pending_jobs: parseInt(stats.total_pending_jobs),
        total_rejected_jobs: parseInt(stats.total_rejected_jobs),
      },
    };

    sendSuccess(res, "Collection point retrieved successfully", pointData);
  } catch (error) {
    console.error("[Collection Point Get Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// PATCH /api/collection-points/:id - Update a collection point
export const updateCollectionPoint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, division, agent_name, agent_phone, status, city } = req.body;

    // Check if collection point exists
    const checkResult = await pool.query("SELECT id, city FROM collection_points WHERE id = $1", [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, "Collection point not found", 404);
    }

    const pointCity = resolvePointCity(req, city || checkResult.rows[0].city);
    if (division !== undefined) {
      await assertDivisionExistsForCity(pointCity, division);
    }

    // If agent_phone is being updated, check for duplicates
    if (agent_phone) {
      const phoneCheck = await pool.query(
        "SELECT id FROM collection_points WHERE agent_phone = $1 AND id != $2",
        [agent_phone, id]
      );
      if (phoneCheck.rows.length > 0) {
        return sendError(res, "Agent phone number already in use", 400);
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (division !== undefined) {
      updates.push(`division = $${paramIndex++}`);
      values.push(division);
    }
    if (agent_name !== undefined) {
      updates.push(`agent_name = $${paramIndex++}`);
      values.push(agent_name);
    }
    if (agent_phone !== undefined) {
      updates.push(`agent_phone = $${paramIndex++}`);
      values.push(agent_phone);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (city !== undefined || req.user?.role === 'CITY_ADMIN') {
      updates.push(`city = $${paramIndex++}`);
      values.push(pointCity);
    }

    if (updates.length === 0) {
      return sendError(res, "No fields to update", 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE collection_points SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, point_code, name, division, city, agent_name, agent_phone, status, updated_at`,
      values
    );

    sendSuccess(res, "Collection point updated successfully", result.rows[0]);
  } catch (error) {
    console.error("[Collection Point Update Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// PATCH /api/collection-points/:id/deactivate - Soft deactivate a collection point
export const deactivateCollectionPoint = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if collection point exists
    const checkResult = await pool.query("SELECT id FROM collection_points WHERE id = $1", [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, "Collection point not found", 404);
    }

    // Set status to INACTIVE
    const result = await pool.query(
      `UPDATE collection_points SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1 RETURNING id, point_code, name, division, agent_name, agent_phone, status, updated_at`,
      [id]
    );

    sendSuccess(res, "Collection point deactivated successfully", result.rows[0]);
  } catch (error) {
    console.error("[Collection Point Deactivate Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

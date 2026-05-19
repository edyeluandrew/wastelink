import pool from "../config/db.js";
import { generatePickerCode } from "../utils/generateCodes.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// POST /api/pickers - Create a new picker
export const createPicker = async (req, res, next) => {
  try {
    const { name, phone, gender, age_group, division, main_waste_type } = req.body;

    // Validate required fields
    if (!name || !phone || !gender || !age_group || !division) {
      return sendError(
        res,
        "Missing required fields: name, phone, gender, age_group, division",
        400
      );
    }

    // Check for duplicate phone
    const phoneCheck = await pool.query(
      "SELECT id FROM pickers WHERE phone = $1",
      [phone]
    );
    if (phoneCheck.rows.length > 0) {
      return sendError(res, "Phone number already registered", 400);
    }

    // Generate picker code
    const pickerCode = generatePickerCode();

    // Insert picker
    const result = await pool.query(
      `INSERT INTO pickers (picker_code, name, phone, gender, age_group, division, main_waste_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       RETURNING id, picker_code, name, phone, gender, age_group, division, main_waste_type, status, created_at`,
      [pickerCode, name, phone, gender, age_group, division, main_waste_type || null]
    );

    sendSuccess(res, "Picker created successfully", result.rows[0], 201);
  } catch (error) {
    console.error("[Picker Create Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/pickers - List all pickers with optional filters
export const getPickers = async (req, res, next) => {
  try {
    const { division, gender, status } = req.query;

    let query = "SELECT id, picker_code, name, phone, gender, age_group, division, main_waste_type, status, created_at FROM pickers WHERE 1=1";
    const params = [];

    if (division) {
      query += ` AND division = $${params.length + 1}`;
      params.push(division);
    }
    if (gender) {
      query += ` AND gender = $${params.length + 1}`;
      params.push(gender);
    }
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, params);
    sendSuccess(res, "Pickers retrieved successfully", result.rows);
  } catch (error) {
    console.error("[Pickers List Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/pickers/:id - Get a picker by ID with earnings summary
export const getPickerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get picker details
    const pickerResult = await pool.query(
      "SELECT id, picker_code, name, phone, gender, age_group, division, main_waste_type, status, created_at, updated_at FROM pickers WHERE id = $1",
      [id]
    );

    if (pickerResult.rows.length === 0) {
      return sendError(res, "Picker not found", 404);
    }

    const picker = pickerResult.rows[0];

    // Get summary stats
    const statsResult = await pool.query(
      `SELECT
        COALESCE(SUM(verified_kg), 0) as total_verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings,
        COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) as pending_jobs
       FROM waste_logs wl
       LEFT JOIN earnings e ON wl.id = e.waste_log_id
       WHERE wl.picker_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0] || {
      total_verified_kg: 0,
      total_earnings: 0,
      pending_jobs: 0,
    };

    const pickerData = {
      ...picker,
      summary: {
        total_verified_kg: parseFloat(stats.total_verified_kg),
        total_earnings: parseInt(stats.total_earnings),
        pending_jobs: parseInt(stats.pending_jobs),
      },
    };

    sendSuccess(res, "Picker retrieved successfully", pickerData);
  } catch (error) {
    console.error("[Picker Get Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// PATCH /api/pickers/:id - Update a picker
export const updatePicker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, gender, age_group, division, main_waste_type, status } = req.body;

    // Check if picker exists
    const checkResult = await pool.query("SELECT id FROM pickers WHERE id = $1", [id]);
    if (checkResult.rows.length === 0) {
      return sendError(res, "Picker not found", 404);
    }

    // If phone is being updated, check for duplicates
    if (phone) {
      const phoneCheck = await pool.query(
        "SELECT id FROM pickers WHERE phone = $1 AND id != $2",
        [phone, id]
      );
      if (phoneCheck.rows.length > 0) {
        return sendError(res, "Phone number already in use", 400);
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
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(gender);
    }
    if (age_group !== undefined) {
      updates.push(`age_group = $${paramIndex++}`);
      values.push(age_group);
    }
    if (division !== undefined) {
      updates.push(`division = $${paramIndex++}`);
      values.push(division);
    }
    if (main_waste_type !== undefined) {
      updates.push(`main_waste_type = $${paramIndex++}`);
      values.push(main_waste_type);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return sendError(res, "No fields to update", 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE pickers SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, picker_code, name, phone, gender, age_group, division, main_waste_type, status, updated_at`,
      values
    );

    sendSuccess(res, "Picker updated successfully", result.rows[0]);
  } catch (error) {
    console.error("[Picker Update Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

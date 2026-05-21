import pool from "../config/db.js";
import { generateWasteJobCode } from "../utils/generateCodes.js";
import { calculateEarnings } from "../utils/calculateEarnings.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// POST /api/waste-logs - Create a new waste log
export const createWasteLog = async (req, res, next) => {
  try {
    const { picker_id, collection_point_id, waste_type, estimated_kg, notes } = req.body;

    // Validate required fields
    if (!picker_id || !collection_point_id || !waste_type || estimated_kg === undefined) {
      return sendError(
        res,
        "Missing required fields: picker_id, collection_point_id, waste_type, estimated_kg",
        400
      );
    }

    // Validate picker exists and is ACTIVE
    const pickerCheck = await pool.query(
      "SELECT id, picker_code, name FROM pickers WHERE id = $1 AND status = 'ACTIVE'",
      [picker_id]
    );
    if (pickerCheck.rows.length === 0) {
      return sendError(res, "Picker not found or inactive", 400);
    }
    const picker = pickerCheck.rows[0];

    // Validate collection point exists and is ACTIVE
    const cpCheck = await pool.query(
      "SELECT id, point_code, name FROM collection_points WHERE id = $1 AND status = 'ACTIVE'",
      [collection_point_id]
    );
    if (cpCheck.rows.length === 0) {
      return sendError(res, "Collection point not found or inactive", 400);
    }
    const collectionPoint = cpCheck.rows[0];

    // Generate job code
    const jobCode = generateWasteJobCode();

    // Insert waste log
    const result = await pool.query(
      `INSERT INTO waste_logs (job_code, picker_id, collection_point_id, waste_type, estimated_kg, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, job_code, picker_id, collection_point_id, waste_type, estimated_kg, verified_kg, status, notes, logged_at, created_at`,
      [jobCode, picker_id, collection_point_id, waste_type, estimated_kg, "PENDING", notes || null]
    );

    const wasteLog = result.rows[0];

    sendSuccess(
      res,
      "Waste log created successfully",
      {
        id: wasteLog.id,
        job_code: wasteLog.job_code,
        picker_id: wasteLog.picker_id,
        picker_code: picker.picker_code,
        picker_name: picker.name,
        collection_point_id: wasteLog.collection_point_id,
        collection_point_code: collectionPoint.point_code,
        collection_point_name: collectionPoint.name,
        waste_type: wasteLog.waste_type,
        estimated_kg: parseFloat(wasteLog.estimated_kg),
        verified_kg: wasteLog.verified_kg ? parseFloat(wasteLog.verified_kg) : null,
        status: wasteLog.status,
        notes: wasteLog.notes,
        logged_at: wasteLog.logged_at,
        created_at: wasteLog.created_at,
      },
      201
    );
  } catch (error) {
    console.error("[Waste Log Create Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/waste-logs - List all waste logs with optional filters
export const getWasteLogs = async (req, res, next) => {
  try {
    const { status, waste_type, division, picker_id, collection_point_id } = req.query;

    let query = `
      SELECT 
        wl.id, wl.job_code, wl.picker_id, wl.collection_point_id,
        wl.waste_type, wl.estimated_kg, wl.verified_kg, wl.status,
        wl.notes, wl.logged_at, wl.verified_at, wl.created_at,
        p.picker_code, p.name as picker_name, p.phone as picker_phone,
        cp.point_code, cp.name as collection_point_name, cp.division
      FROM waste_logs wl
      JOIN pickers p ON wl.picker_id = p.id
      JOIN collection_points cp ON wl.collection_point_id = cp.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND wl.status = $${params.length + 1}`;
      params.push(status);
    }
    if (waste_type) {
      query += ` AND wl.waste_type = $${params.length + 1}`;
      params.push(waste_type);
    }
    if (division) {
      query += ` AND cp.division = $${params.length + 1}`;
      params.push(division);
    }
    if (picker_id) {
      query += ` AND wl.picker_id = $${params.length + 1}`;
      params.push(picker_id);
    }
    if (collection_point_id) {
      query += ` AND wl.collection_point_id = $${params.length + 1}`;
      params.push(collection_point_id);
    }

    query += " ORDER BY wl.created_at DESC";

    const result = await pool.query(query, params);
    const wasteLogs = result.rows.map(row => ({
      id: row.id,
      job_code: row.job_code,
      picker_id: row.picker_id,
      picker_code: row.picker_code,
      picker_name: row.picker_name,
      picker_phone: row.picker_phone,
      collection_point_id: row.collection_point_id,
      collection_point_code: row.point_code,
      collection_point_name: row.collection_point_name,
      division: row.division,
      waste_type: row.waste_type,
      estimated_kg: parseFloat(row.estimated_kg),
      verified_kg: row.verified_kg ? parseFloat(row.verified_kg) : null,
      status: row.status,
      notes: row.notes,
      logged_at: row.logged_at,
      verified_at: row.verified_at,
      created_at: row.created_at,
    }));

    sendSuccess(res, "Waste logs retrieved successfully", wasteLogs);
  } catch (error) {
    console.error("[Waste Logs List Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/waste-logs/:id - Get a waste log by ID with earnings
export const getWasteLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        wl.id, wl.job_code, wl.picker_id, wl.collection_point_id,
        wl.waste_type, wl.estimated_kg, wl.verified_kg, wl.status,
        wl.notes, wl.rejection_reason, wl.logged_at, wl.verified_at, wl.created_at, wl.updated_at,
        p.picker_code, p.name as picker_name, p.phone as picker_phone,
        cp.point_code, cp.name as collection_point_name, cp.division
      FROM waste_logs wl
      JOIN pickers p ON wl.picker_id = p.id
      JOIN collection_points cp ON wl.collection_point_id = cp.id
      WHERE wl.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Waste log not found", 404);
    }

    const row = result.rows[0];

    // Get earnings if available
    let earning = null;
    const earningResult = await pool.query(
      "SELECT id, rate_per_kg, amount, status, created_at, paid_at FROM earnings WHERE waste_log_id = $1",
      [id]
    );
    if (earningResult.rows.length > 0) {
      const e = earningResult.rows[0];
      earning = {
        id: e.id,
        rate_per_kg: e.rate_per_kg,
        amount: e.amount,
        status: e.status,
        created_at: e.created_at,
        paid_at: e.paid_at,
      };
    }

    const wasteLog = {
      id: row.id,
      job_code: row.job_code,
      picker_id: row.picker_id,
      picker_code: row.picker_code,
      picker_name: row.picker_name,
      picker_phone: row.picker_phone,
      collection_point_id: row.collection_point_id,
      collection_point_code: row.point_code,
      collection_point_name: row.collection_point_name,
      division: row.division,
      waste_type: row.waste_type,
      estimated_kg: parseFloat(row.estimated_kg),
      verified_kg: row.verified_kg ? parseFloat(row.verified_kg) : null,
      status: row.status,
      notes: row.notes,
      rejection_reason: row.rejection_reason,
      logged_at: row.logged_at,
      verified_at: row.verified_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      earning,
    };

    sendSuccess(res, "Waste log retrieved successfully", wasteLog);
  } catch (error) {
    console.error("[Waste Log Get Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/waste-logs/job/:jobCode - Get waste log by job code
export const getWasteLogByJobCode = async (req, res, next) => {
  try {
    // Handle both path params (/job/:jobCode) and query params (/search?jobCode=...)
    const jobCode = req.params.jobCode || req.query.jobCode;

    if (!jobCode) {
      return sendError(res, "Job code is required", 400);
    }

    const result = await pool.query(
      `SELECT 
        wl.id, wl.job_code, wl.picker_id, wl.collection_point_id,
        wl.waste_type, wl.estimated_kg, wl.verified_kg, wl.status,
        wl.notes, wl.rejection_reason, wl.logged_at, wl.verified_at, wl.created_at, wl.updated_at,
        p.picker_code, p.name as picker_name, p.phone as picker_phone,
        cp.point_code, cp.name as collection_point_name, cp.division
      FROM waste_logs wl
      JOIN pickers p ON wl.picker_id = p.id
      JOIN collection_points cp ON wl.collection_point_id = cp.id
      WHERE wl.job_code = $1`,
      [jobCode]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Waste log not found", 404);
    }

    const row = result.rows[0];

    // Get earnings if available
    let earning = null;
    const earningResult = await pool.query(
      "SELECT id, rate_per_kg, amount, status, created_at, paid_at FROM earnings WHERE waste_log_id = $1",
      [row.id]
    );
    if (earningResult.rows.length > 0) {
      const e = earningResult.rows[0];
      earning = {
        id: e.id,
        rate_per_kg: e.rate_per_kg,
        amount: e.amount,
        status: e.status,
        created_at: e.created_at,
        paid_at: e.paid_at,
      };
    }

    const wasteLog = {
      id: row.id,
      job_code: row.job_code,
      picker_id: row.picker_id,
      picker_code: row.picker_code,
      picker_name: row.picker_name,
      picker_phone: row.picker_phone,
      collection_point_id: row.collection_point_id,
      collection_point_code: row.point_code,
      collection_point_name: row.collection_point_name,
      division: row.division,
      waste_type: row.waste_type,
      estimated_kg: parseFloat(row.estimated_kg),
      verified_kg: row.verified_kg ? parseFloat(row.verified_kg) : null,
      status: row.status,
      notes: row.notes,
      rejection_reason: row.rejection_reason,
      logged_at: row.logged_at,
      verified_at: row.verified_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      earning,
    };

    sendSuccess(res, "Waste log retrieved successfully", wasteLog);
  } catch (error) {
    console.error("[Waste Log Job Code Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// PATCH /api/waste-logs/:id/verify - Verify waste log and create earnings
export const verifyWasteLog = async (req, res, next) => {
  let client;
  try {
    const { id } = req.params;
    const { verified_kg, notes } = req.body;

    // Validate required field
    if (verified_kg === undefined || verified_kg === null) {
      return sendError(res, "verified_kg is required", 400);
    }

    if (Number(verified_kg) <= 0) {
      return sendError(res, "verified_kg must be greater than 0", 400);
    }

    // Get a client from the pool for transaction
    client = await pool.connect();

    // Start transaction
    await client.query("BEGIN");

    try {
      // Check if waste log exists and is PENDING
      const wasteLogResult = await client.query(
        "SELECT id, status, waste_type, picker_id, job_code FROM waste_logs WHERE id = $1 FOR UPDATE",
        [id]
      );

      if (wasteLogResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return sendError(res, "Waste log not found", 404);
      }

      const wasteLog = wasteLogResult.rows[0];

      if (wasteLog.status !== "PENDING") {
        await client.query("ROLLBACK");
        return sendError(res, `Waste log cannot be verified. Current status: ${wasteLog.status}`, 400);
      }

      // Check if earnings already exist (prevent duplicates)
      const earningCheck = await client.query(
        "SELECT id FROM earnings WHERE waste_log_id = $1",
        [id]
      );

      if (earningCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return sendError(res, "Earnings already exist for this waste log", 400);
      }

      // Update waste log
      const updateResult = await client.query(
        `UPDATE waste_logs 
         SET verified_kg = $1, status = 'VERIFIED', verified_at = NOW(), updated_at = NOW(), notes = $2
         WHERE id = $3
         RETURNING id, job_code, waste_type, verified_kg, picker_id`,
        [verified_kg, notes || null, id]
      );

      const updatedWasteLog = updateResult.rows[0];

      // Calculate earnings
      const { ratePerKg, amount } = calculateEarnings(
        wasteLog.waste_type,
        verified_kg
      );

      // Insert earnings record
      const earningResult = await client.query(
        `INSERT INTO earnings (picker_id, waste_log_id, rate_per_kg, amount, status)
         VALUES ($1, $2, $3, $4, 'PENDING')
         RETURNING id, rate_per_kg, amount, status, created_at`,
        [wasteLog.picker_id, id, ratePerKg, amount]
      );

      const earning = earningResult.rows[0];

      // Commit transaction
      await client.query("COMMIT");

      sendSuccess(res, "Waste log verified successfully", {
        id: updatedWasteLog.id,
        job_code: updatedWasteLog.job_code,
        waste_type: updatedWasteLog.waste_type,
        verified_kg: parseFloat(updatedWasteLog.verified_kg),
        status: "VERIFIED",
        earning: {
          id: earning.id,
          rate_per_kg: earning.rate_per_kg,
          amount: earning.amount,
          status: earning.status,
          created_at: earning.created_at,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("[Waste Log Verify Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  } finally {
    if (client) client.release();
  }
};

// PATCH /api/waste-logs/:id/reject - Reject a waste log
export const rejectWasteLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if waste log exists and is PENDING
    const wasteLogResult = await pool.query(
      "SELECT id, status, job_code FROM waste_logs WHERE id = $1",
      [id]
    );

    if (wasteLogResult.rows.length === 0) {
      return sendError(res, "Waste log not found", 404);
    }

    const wasteLog = wasteLogResult.rows[0];

    if (wasteLog.status !== "PENDING") {
      return sendError(res, `Waste log cannot be rejected. Current status: ${wasteLog.status}`, 400);
    }

    // Update waste log
    const updateResult = await pool.query(
      `UPDATE waste_logs 
       SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, job_code, status, waste_type, estimated_kg, rejection_reason, updated_at`,
      [reason || null, id]
    );

    const updatedWasteLog = updateResult.rows[0];

    sendSuccess(res, "Waste log rejected successfully", {
      id: updatedWasteLog.id,
      job_code: updatedWasteLog.job_code,
      status: updatedWasteLog.status,
      waste_type: updatedWasteLog.waste_type,
      estimated_kg: parseFloat(updatedWasteLog.estimated_kg),
      rejection_reason: updatedWasteLog.rejection_reason,
      updated_at: updatedWasteLog.updated_at,
    });
  } catch (error) {
    console.error("[Waste Log Reject Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// PATCH /api/waste-logs/:id/mark-paid - Mark waste log as paid
export const markWasteLogPaid = async (req, res, next) => {
  let client;
  try {
    const { id } = req.params;

    client = await pool.connect();
    await client.query("BEGIN");

    try {
      // Check if waste log exists and is VERIFIED
      const wasteLogResult = await client.query(
        "SELECT id, status FROM waste_logs WHERE id = $1 FOR UPDATE",
        [id]
      );

      if (wasteLogResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return sendError(res, "Waste log not found", 404);
      }

      const wasteLog = wasteLogResult.rows[0];

      if (wasteLog.status !== "VERIFIED") {
        await client.query("ROLLBACK");
        return sendError(res, `Waste log cannot be marked as paid. Current status: ${wasteLog.status}`, 400);
      }

      // Check if earnings exist
      const earningResult = await client.query(
        "SELECT id, status FROM earnings WHERE waste_log_id = $1 FOR UPDATE",
        [id]
      );

      if (earningResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return sendError(res, "No earnings found for this waste log", 404);
      }

      const earning = earningResult.rows[0];

      // Update earning status
      const updatedEarningResult = await client.query(
        `UPDATE earnings 
         SET status = 'PAID', paid_at = NOW()
         WHERE id = $1
         RETURNING id, rate_per_kg, amount, status, paid_at`,
        [earning.id]
      );

      const updatedEarning = updatedEarningResult.rows[0];

      // Update waste log status
      const updatedWasteLogResult = await client.query(
        `UPDATE waste_logs 
         SET status = 'PAID', updated_at = NOW()
         WHERE id = $1
         RETURNING id, job_code, status, verified_kg`,
        [id]
      );

      const updatedWasteLog = updatedWasteLogResult.rows[0];

      await client.query("COMMIT");

      sendSuccess(res, "Waste log marked as paid successfully", {
        id: updatedWasteLog.id,
        job_code: updatedWasteLog.job_code,
        status: updatedWasteLog.status,
        verified_kg: parseFloat(updatedWasteLog.verified_kg),
        earning: {
          id: updatedEarning.id,
          rate_per_kg: updatedEarning.rate_per_kg,
          amount: updatedEarning.amount,
          status: updatedEarning.status,
          paid_at: updatedEarning.paid_at,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("[Waste Log Mark Paid Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  } finally {
    if (client) client.release();
  }
};

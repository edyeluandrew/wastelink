import pool from "../config/db.js";
import { generateWasteJobCode } from "../utils/generateCodes.js";
import { calculateEarnings as calculateLegacyEarnings } from "../utils/calculateEarnings.js";
import {
  getActiveCityWasteTypeForLog,
  getCityWasteTypeById,
  calculateEarningFromCityWasteType,
} from "../services/wasteTypeGovernanceService.js";
import { normalizeCity } from "../utils/cityScope.js";
import {
  transitionEarningPayment,
  getPaymentStatusHistory,
  recordPaymentStatusChange,
} from "../services/payment/earningPaymentService.js";
import { PAYMENT_STATUS } from "../utils/paymentStatus.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// POST /api/waste-logs - Create a new waste log
export const createWasteLog = async (req, res, next) => {
  try {
    let { picker_id, collection_point_id, waste_type, city_waste_type_id, estimated_kg, notes } = req.body;

    // If an authenticated PICKER is creating the log, force picker_id to their linked picker
    if (req.user?.role === 'PICKER') {
      picker_id = req.user.picker_id;
    }

    if (!picker_id || !collection_point_id || estimated_kg === undefined) {
      return sendError(
        res,
        "Missing required fields: picker_id, collection_point_id, estimated_kg",
        400
      );
    }

    if (!city_waste_type_id && !waste_type) {
      return sendError(res, "city_waste_type_id or waste_type is required", 400);
    }

    const logCity = normalizeCity(process.env.DEFAULT_CITY);
    let resolvedWasteType = waste_type;
    let resolvedCityWasteTypeId = city_waste_type_id ? parseInt(city_waste_type_id, 10) : null;

    if (resolvedCityWasteTypeId) {
      const cityWasteType = await getActiveCityWasteTypeForLog(resolvedCityWasteTypeId, logCity);
      if (!cityWasteType) {
        return sendError(res, "Selected city waste type is not active for your city", 400);
      }
      resolvedWasteType = cityWasteType.name;
    }

    if (!resolvedWasteType) {
      return sendError(res, "waste_type could not be resolved", 400);
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
      `INSERT INTO waste_logs (
        job_code, picker_id, collection_point_id, waste_type, city_waste_type_id,
        estimated_kg, status, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, job_code, picker_id, collection_point_id, waste_type, city_waste_type_id,
         estimated_kg, verified_kg, status, notes, logged_at, created_at`,
      [jobCode, picker_id, collection_point_id, resolvedWasteType, resolvedCityWasteTypeId, estimated_kg, "PENDING", notes || null]
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
        city_waste_type_id: wasteLog.city_waste_type_id,
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
    let { status, waste_type, division, picker_id, collection_point_id } = req.query;

    // If authenticated as a PICKER, enforce picker_id scoping
    if (req.user?.role === 'PICKER') {
      // If a picker_id was provided but doesn't match the auth user's picker_id, forbid
      if (picker_id && String(picker_id) !== String(req.user.picker_id)) {
        return sendError(res, 'Forbidden: cannot query other picker data', 403);
      }
      picker_id = req.user.picker_id;
    }

    let query = `
      SELECT 
        wl.id, wl.job_code, wl.picker_id, wl.collection_point_id,
        wl.waste_type, wl.city_waste_type_id, wl.estimated_kg, wl.verified_kg, wl.status,
        wl.notes, wl.logged_at, wl.verified_at, wl.created_at,
        wl.price_per_kg_snapshot, wl.reporting_category_id,
        p.picker_code, p.name as picker_name, p.phone as picker_phone,
        cp.point_code, cp.name as collection_point_name, cp.division,
        cwt.name as city_waste_type_name, cwt.price_per_kg as city_price_per_kg, cwt.is_payable as city_is_payable,
        rc.name as reporting_category_name,
        e.id as earning_id, e.rate_per_kg, e.amount, e.status as earning_status, e.paid_at
      FROM waste_logs wl
      JOIN pickers p ON wl.picker_id = p.id
      JOIN collection_points cp ON wl.collection_point_id = cp.id
      LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
      LEFT JOIN reporting_categories rc ON wl.reporting_category_id = rc.id
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
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
    const wasteLogs = result.rows.map(row => {
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
        city_waste_type_id: row.city_waste_type_id,
        city_waste_type_name: row.city_waste_type_name,
        city_price_per_kg: row.city_price_per_kg != null ? parseFloat(row.city_price_per_kg) : null,
        city_is_payable: row.city_is_payable,
        reporting_category_id: row.reporting_category_id,
        reporting_category_name: row.reporting_category_name,
        price_per_kg_snapshot: row.price_per_kg_snapshot != null ? parseFloat(row.price_per_kg_snapshot) : null,
        estimated_kg: parseFloat(row.estimated_kg),
        verified_kg: row.verified_kg ? parseFloat(row.verified_kg) : null,
        status: row.status,
        notes: row.notes,
        logged_at: row.logged_at,
        verified_at: row.verified_at,
        created_at: row.created_at,
        // Flat earning fields for convenience
        earning_id: row.earning_id,
        amount: row.amount !== null ? parseInt(row.amount) : null,
        rate_per_kg: row.rate_per_kg,
        earning_status: row.earning_status,
        paid_at: row.paid_at,
      };
      
      // Also include nested earning object
      if (row.earning_id) {
        wasteLog.earning = {
          id: row.earning_id,
          rate_per_kg: row.rate_per_kg,
          amount: parseInt(row.amount),
          status: row.earning_status,
          paid_at: row.paid_at,
        };
      } else {
        wasteLog.earning = null;
      }
      
      return wasteLog;
    });

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
        wl.waste_type, wl.city_waste_type_id, wl.estimated_kg, wl.verified_kg, wl.status,
        wl.notes, wl.rejection_reason, wl.logged_at, wl.verified_at, wl.created_at, wl.updated_at,
        wl.price_per_kg_snapshot, wl.is_payable_snapshot, wl.reporting_category_id,
        p.picker_code, p.name as picker_name, p.phone as picker_phone,
        cp.point_code, cp.name as collection_point_name, cp.division,
        cwt.name as city_waste_type_name, cwt.price_per_kg as city_price_per_kg, cwt.is_payable as city_is_payable,
        rc.name as reporting_category_name
      FROM waste_logs wl
      JOIN pickers p ON wl.picker_id = p.id
      JOIN collection_points cp ON wl.collection_point_id = cp.id
      LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
      LEFT JOIN reporting_categories rc ON wl.reporting_category_id = rc.id
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
      city_waste_type_id: row.city_waste_type_id,
      city_waste_type_name: row.city_waste_type_name,
      city_price_per_kg: row.city_price_per_kg != null ? parseFloat(row.city_price_per_kg) : null,
      city_is_payable: row.city_is_payable,
      reporting_category_id: row.reporting_category_id,
      reporting_category_name: row.reporting_category_name,
      price_per_kg_snapshot: row.price_per_kg_snapshot != null ? parseFloat(row.price_per_kg_snapshot) : null,
      is_payable_snapshot: row.is_payable_snapshot,
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
        `SELECT id, status, waste_type, city_waste_type_id, picker_id, job_code, collection_point_id
         FROM waste_logs WHERE id = $1 FOR UPDATE`,
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

      if (req.user?.role === 'PICKER') {
        await client.query('ROLLBACK');
        return sendError(res, 'Pickers are not allowed to verify waste logs', 403);
      }

      if (
        req.user?.role === "AGENT" &&
        String(req.user.collection_point_id || "") !== String(wasteLog.collection_point_id || "")
      ) {
        await client.query("ROLLBACK");
        return sendError(res, "You can only verify waste assigned to your collection point.", 403);
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

      let ratePerKg = 0;
      let amount = 0;
      let reportingCategoryId = null;
      let pricePerKgSnapshot = null;
      let isPayableSnapshot = false;
      let cityWasteTypeId = wasteLog.city_waste_type_id || null;

      let pricingSource = null;

      if (cityWasteTypeId) {
        pricingSource = await getActiveCityWasteTypeForLog(
          cityWasteTypeId,
          normalizeCity(process.env.DEFAULT_CITY),
          client
        );

        if (!pricingSource) {
          pricingSource = await getCityWasteTypeById(cityWasteTypeId, client);
        }

        if (!pricingSource) {
          await client.query('ROLLBACK');
          return sendError(res, 'Linked city waste type not found', 400);
        }

        ({ ratePerKg, amount } = calculateEarningFromCityWasteType(pricingSource, verified_kg));
        reportingCategoryId = pricingSource.reporting_category_id;
        pricePerKgSnapshot = pricingSource.price_per_kg;
        isPayableSnapshot = pricingSource.is_payable;
      } else {
        ({ ratePerKg, amount } = calculateLegacyEarnings(wasteLog.waste_type, verified_kg));
      }

      const updateResult = await client.query(
        `UPDATE waste_logs 
         SET verified_kg = $1, status = 'VERIFIED', verified_at = NOW(), updated_at = NOW(),
             reporting_category_id = $2,
             price_per_kg_snapshot = $3,
             is_payable_snapshot = $4,
             notes = CASE WHEN $5::text IS NOT NULL AND TRIM($5::text) != '' THEN $5::text ELSE notes END
         WHERE id = $6
         RETURNING id, job_code, waste_type, city_waste_type_id, estimated_kg, verified_kg, picker_id,
           price_per_kg_snapshot, reporting_category_id, is_payable_snapshot`,
        [verified_kg, reportingCategoryId, pricePerKgSnapshot, isPayableSnapshot, notes || null, id]
      );

      const updatedWasteLog = updateResult.rows[0];

      const earningResult = await client.query(
        `INSERT INTO earnings (
          picker_id, waste_log_id, rate_per_kg, amount, status,
          city_waste_type_id, reporting_category_id
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, rate_per_kg, amount, status, created_at, paid_at,
           city_waste_type_id, reporting_category_id`,
        [wasteLog.picker_id, id, ratePerKg, amount, PAYMENT_STATUS.AVAILABLE, cityWasteTypeId, reportingCategoryId]
      );

      const earning = earningResult.rows[0];

      if (amount > 0) {
        await recordPaymentStatusChange(client, {
          earningId: earning.id,
          wasteLogId: id,
          fromStatus: null,
          toStatus: PAYMENT_STATUS.AVAILABLE,
          amount,
          changedBy: req.user?.id || null,
          notes: 'Earning created on agent verification — immediately withdrawable',
          isSimulated: false,
        });
      }

      // Commit transaction
      await client.query("COMMIT");

      sendSuccess(res, "Waste log verified successfully", {
        id: updatedWasteLog.id,
        job_code: updatedWasteLog.job_code,
        waste_type: updatedWasteLog.waste_type,
        city_waste_type_id: updatedWasteLog.city_waste_type_id,
        estimated_kg: parseFloat(updatedWasteLog.estimated_kg),
        verified_kg: parseFloat(updatedWasteLog.verified_kg),
        price_per_kg_snapshot: updatedWasteLog.price_per_kg_snapshot != null
          ? parseFloat(updatedWasteLog.price_per_kg_snapshot)
          : null,
        reporting_category_id: updatedWasteLog.reporting_category_id,
        is_payable_snapshot: updatedWasteLog.is_payable_snapshot,
        status: "VERIFIED",
        earning: {
          id: earning.id,
          rate_per_kg: earning.rate_per_kg,
          amount: earning.amount,
          status: earning.status,
          created_at: earning.created_at,
          paid_at: earning.paid_at,
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
    const { reason, rejection_reason } = req.body;
    const resolvedReason = reason ?? rejection_reason;

    // Check if waste log exists and is PENDING
    const wasteLogResult = await pool.query(
      "SELECT id, status, job_code, collection_point_id FROM waste_logs WHERE id = $1",
      [id]
    );

    if (wasteLogResult.rows.length === 0) {
      return sendError(res, "Waste log not found", 404);
    }

    const wasteLog = wasteLogResult.rows[0];

    if (wasteLog.status !== "PENDING") {
      return sendError(res, `Waste log cannot be rejected. Current status: ${wasteLog.status}`, 400);
    }

    if (req.user?.role === 'PICKER') {
      return sendError(res, 'Pickers are not allowed to reject waste logs', 403);
    }

    if (
      req.user?.role === "AGENT" &&
      String(req.user.collection_point_id || "") !== String(wasteLog.collection_point_id || "")
    ) {
      return sendError(res, "You can only verify waste assigned to your collection point.", 403);
    }

    // Update waste log
    const updateResult = await pool.query(
      `UPDATE waste_logs 
       SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, job_code, status, waste_type, estimated_kg, rejection_reason, updated_at`,
      [resolvedReason || null, id]
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

// Helper: load waste log + earning for payout actions
const loadVerifiedLogWithEarning = async (client, wasteLogId) => {
  const wasteLogResult = await client.query(
    `SELECT wl.id, wl.status, wl.picker_id, wl.job_code, wl.verified_kg
     FROM waste_logs wl WHERE wl.id = $1 FOR UPDATE`,
    [wasteLogId]
  );

  if (wasteLogResult.rows.length === 0) {
    return { error: { status: 404, message: "Waste log not found" } };
  }

  const wasteLog = wasteLogResult.rows[0];

  if (!['VERIFIED', 'PAID'].includes(wasteLog.status)) {
    return {
      error: {
        status: 400,
        message: `Payout actions require a verified waste log. Current status: ${wasteLog.status}`,
      },
    };
  }

  const earningResult = await client.query(
    `SELECT id, status, amount, picker_id, waste_log_id, paid_at
     FROM earnings WHERE waste_log_id = $1 FOR UPDATE`,
    [wasteLogId]
  );

  if (earningResult.rows.length === 0) {
    return { error: { status: 404, message: "No earnings found for this waste log" } };
  }

  return { wasteLog, earning: earningResult.rows[0] };
};

const handlePayoutTransition = async (req, res, toStatus, { simulate = false, notes = null } = {}) => {
  let client;
  try {
    const { id } = req.params;
    const { payment_reference, phone } = req.body || {};

    if (req.user?.role === 'PICKER') {
      return sendError(res, 'Pickers are not allowed to manage payouts', 403);
    }

    client = await pool.connect();
    await client.query("BEGIN");

    try {
      const loaded = await loadVerifiedLogWithEarning(client, id);
      if (loaded.error) {
        await client.query("ROLLBACK");
        return sendError(res, loaded.error.message, loaded.error.status);
      }

      const { wasteLog, earning } = loaded;

      if (earning.status === PAYMENT_STATUS.PAID) {
        await client.query("ROLLBACK");
        return sendError(res, "This earning has already been paid", 400);
      }

      const result = await transitionEarningPayment(client, {
        earningId: earning.id,
        wasteLogId: wasteLog.id,
        pickerId: wasteLog.picker_id,
        toStatus,
        changedBy: req.user?.id || null,
        notes,
        paymentReference: payment_reference || null,
        phone: phone || null,
        simulate,
      });

      await client.query("COMMIT");

      const history = await getPaymentStatusHistory(client, earning.id);

      sendSuccess(res, `Payment status updated to ${toStatus}`, {
        waste_log_id: wasteLog.id,
        job_code: wasteLog.job_code,
        verified_kg: parseFloat(wasteLog.verified_kg),
        earning: {
          id: result.earning.id,
          amount: result.earning.amount,
          status: result.earning.status,
          paid_at: result.earning.paid_at,
        },
        payment_reference: result.payment_reference,
        is_simulated: result.is_simulated,
        payout_transaction: result.payout_transaction,
        payment_status_history: history,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("[Payout Transition Error]", { code: error.code, message: error.message });
    const status = error.status || 503;
    const message = error.status ? error.message : "Database connection failed. Please check Neon DATABASE_URL or network configuration.";
    sendError(res, message, status);
  } finally {
    if (client) client.release();
  }
};

// PATCH /api/waste-logs/:id/payout/simulate-confirm - PAYOUT_PROCESSING -> PAID (demo)
export const simulatePayoutConfirm = async (req, res) =>
  handlePayoutTransition(req, res, PAYMENT_STATUS.PAID, {
    simulate: true,
    notes: req.body?.notes || 'Demo/simulated mobile money payout confirmed',
  });

// PATCH /api/waste-logs/:id/payout/simulate-fail - PAYOUT_PROCESSING -> FAILED (demo)
export const simulatePayoutFail = async (req, res) =>
  handlePayoutTransition(req, res, PAYMENT_STATUS.FAILED, {
    notes: req.body?.notes || req.body?.reason || 'Simulated provider payout failure',
  });

// PATCH /api/waste-logs/:id/payout/retry - FAILED -> PAYOUT_PROCESSING
export const retryPayout = async (req, res) =>
  handlePayoutTransition(req, res, PAYMENT_STATUS.PAYOUT_PROCESSING, {
    simulate: true,
    notes: req.body?.notes || 'Payout retry initiated',
  });

// PATCH /api/waste-logs/:id/payout/return-to-balance - FAILED -> AVAILABLE
export const returnPayoutToBalance = async (req, res) =>
  handlePayoutTransition(req, res, PAYMENT_STATUS.AVAILABLE, {
    notes: req.body?.notes || 'Returned to picker withdrawable balance',
  });

// Legacy endpoints — admin approval no longer required (Module 15)
export const approvePayout = async (req, res) =>
  sendError(res, 'Admin approval is no longer required. Earnings are AVAILABLE after agent verification.', 410);

export const initiatePayout = async (req, res) =>
  sendError(res, 'Use picker withdrawal flow instead. Earnings move to PAYOUT_PROCESSING when picker withdraws.', 410);

// PATCH /api/waste-logs/:id/mark-paid - Legacy alias; requires PAYOUT_INITIATED
export const markWasteLogPaid = async (req, res) => {
  const { id } = req.params;
  let client;

  try {
    if (req.user?.role === 'PICKER') {
      return sendError(res, 'Pickers are not allowed to mark waste logs as paid', 403);
    }

    client = await pool.connect();
    const earningResult = await client.query(
      'SELECT status FROM earnings WHERE waste_log_id = $1',
      [id]
    );

    if (earningResult.rows.length === 0) {
      return sendError(res, 'No earnings found for this waste log', 404);
    }

    const currentStatus = earningResult.rows[0].status;

    if (currentStatus === PAYMENT_STATUS.PAYOUT_PROCESSING) {
      return simulatePayoutConfirm(req, res);
    }

    if (currentStatus === PAYMENT_STATUS.AVAILABLE) {
      return sendError(
        res,
        'Picker must request withdrawal first. Earnings become PAYOUT_PROCESSING when a withdrawal is submitted.',
        400
      );
    }

    return sendError(
      res,
      `Cannot mark as paid from status ${currentStatus}`,
      400
    );
  } finally {
    if (client) client.release();
  }

  return simulatePayoutConfirm(req, res);
};

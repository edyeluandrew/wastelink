import pool from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { normalizeCity, resolveUserCity } from "../utils/cityScope.js";
import { sqlOriginalEarningAmount } from "../utils/earningReportQueries.js";
import { ensureWithdrawalTables } from "../services/payment/withdrawalService.js";

const UGANDA_TZ = "Africa/Kampala";
const todayInUganda = `(NOW() AT TIME ZONE '${UGANDA_TZ}')::date`;

const resolveDashboardCity = (req) => {
  if (req.user?.role === "CITY_ADMIN") {
    return normalizeCity(resolveUserCity(req.user));
  }
  return null;
};

const buildCityFilterClause = (city, paramIndex) => {
  if (!city) {
    return { clause: "", params: [] };
  }

  return {
    clause: ` AND LOWER(COALESCE(cp.city, '')) = LOWER($${paramIndex})`,
    params: [city],
  };
};

// GET /api/dashboard/stats - Overall system statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    // Get picker statistics
    const pickerStats = await pool.query(`
      SELECT
        COUNT(*) as total_pickers,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_pickers,
        COUNT(CASE WHEN status = 'INACTIVE' THEN 1 END) as inactive_pickers,
        COUNT(CASE WHEN LOWER(gender) = 'female' THEN 1 END) as women_pickers,
        COUNT(CASE WHEN LOWER(gender) = 'male' THEN 1 END) as men_pickers,
        COUNT(CASE WHEN age_group IN ('Below 18', '18-24', '25-35') THEN 1 END) as youth_pickers
      FROM pickers
    `);

    const {
      total_pickers,
      active_pickers,
      inactive_pickers,
      women_pickers,
      men_pickers,
      youth_pickers,
    } = pickerStats.rows[0];

    // Get collection point statistics
    const cpStats = await pool.query(`
      SELECT
        COUNT(*) as total_collection_points,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_collection_points,
        COUNT(CASE WHEN status = 'INACTIVE' THEN 1 END) as inactive_collection_points
      FROM collection_points
    `);

    const {
      total_collection_points,
      active_collection_points,
      inactive_collection_points,
    } = cpStats.rows[0];

    // Get waste logs statistics
    const wasteStats = await pool.query(`
      SELECT
        COUNT(*) as total_waste_logs,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_logs,
        COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) as verified_logs,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_logs,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_logs,
        COALESCE(SUM(estimated_kg), 0) as total_estimated_kg,
        COALESCE(SUM(verified_kg), 0) as total_verified_kg
      FROM waste_logs
    `);

    const {
      total_waste_logs,
      pending_logs,
      verified_logs,
      rejected_logs,
      paid_logs,
      total_estimated_kg,
      total_verified_kg,
    } = wasteStats.rows[0];

    // Verified earnings (locked at verify) vs disbursements vs withdrawable wallet
    await ensureWithdrawalTables(pool);

    const earningsStats = await pool.query(`
      SELECT
        COALESCE(SUM(${sqlOriginalEarningAmount('e')}), 0) as total_earned,
        COALESCE(SUM(CASE WHEN e.status = 'AVAILABLE' THEN e.amount ELSE 0 END), 0) as withdrawable_balance
      FROM earnings e
      JOIN waste_logs wl ON e.waste_log_id = wl.id
      WHERE wl.verified_at IS NOT NULL
    `);

    const withdrawnStats = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_withdrawn
      FROM withdrawal_requests
      WHERE status = 'SUCCESS'
    `);

    const {
      total_earned,
      withdrawable_balance,
    } = earningsStats.rows[0];
    const total_withdrawn = withdrawnStats.rows[0]?.total_withdrawn ?? 0;

    // Calculate percentages
    const women_percentage =
      total_pickers > 0 ? Math.round((women_pickers / total_pickers) * 100) : 0;
    const youth_percentage =
      total_pickers > 0 ? Math.round((youth_pickers / total_pickers) * 100) : 0;

    sendSuccess(res, "Dashboard stats fetched successfully", {
      total_pickers: parseInt(total_pickers),
      active_pickers: parseInt(active_pickers),
      inactive_pickers: parseInt(inactive_pickers),
      total_collection_points: parseInt(total_collection_points),
      active_collection_points: parseInt(active_collection_points),
      inactive_collection_points: parseInt(inactive_collection_points),
      total_waste_logs: parseInt(total_waste_logs),
      pending_logs: parseInt(pending_logs),
      verified_logs: parseInt(verified_logs),
      rejected_logs: parseInt(rejected_logs),
      paid_logs: parseInt(paid_logs),
      total_verified_kg: parseFloat(total_verified_kg),
      total_estimated_kg: parseFloat(total_estimated_kg),
      total_earned: parseInt(total_earned, 10),
      total_earnings: parseInt(total_earned, 10),
      verified_earnings: parseInt(total_earned, 10),
      total_withdrawn: parseInt(total_withdrawn, 10),
      paid_earnings: parseInt(total_withdrawn, 10),
      disbursed_earnings: parseInt(total_withdrawn, 10),
      withdrawable_balance: parseInt(withdrawable_balance, 10),
      in_wallet_earnings: parseInt(withdrawable_balance, 10),
      women_pickers: parseInt(women_pickers),
      men_pickers: parseInt(men_pickers),
      youth_pickers: parseInt(youth_pickers),
      women_percentage,
      youth_percentage,
    });
  } catch (error) {
    console.error("[Dashboard Stats Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/dashboard/divisions - Performance by division
export const getDashboardDivisions = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        p.division,
        COUNT(DISTINCT p.id) as total_pickers,
        COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END) as active_pickers,
        COUNT(DISTINCT cp.id) as total_collection_points,
        COUNT(wl.id) as total_logs,
        COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) as pending_logs,
        COUNT(CASE WHEN wl.status = 'VERIFIED' THEN 1 END) as verified_logs,
        COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) as rejected_logs,
        COUNT(CASE WHEN wl.status = 'PAID' THEN 1 END) as paid_logs,
        COALESCE(SUM(wl.verified_kg), 0) as total_verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM pickers p
      LEFT JOIN collection_points cp ON p.division = cp.division
      LEFT JOIN waste_logs wl ON p.id = wl.picker_id
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY p.division
      ORDER BY p.division ASC
    `);

    const divisions = result.rows.map(row => ({
      division: row.division,
      total_pickers: parseInt(row.total_pickers),
      active_pickers: parseInt(row.active_pickers),
      total_collection_points: parseInt(row.total_collection_points),
      total_logs: parseInt(row.total_logs),
      pending_logs: parseInt(row.pending_logs),
      verified_logs: parseInt(row.verified_logs),
      rejected_logs: parseInt(row.rejected_logs),
      paid_logs: parseInt(row.paid_logs),
      total_verified_kg: parseFloat(row.total_verified_kg),
      total_earnings: parseInt(row.total_earnings),
    }));

    sendSuccess(res, "Division statistics fetched successfully", divisions);
  } catch (error) {
    console.error("[Dashboard Divisions Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/dashboard/recent-logs - Latest waste logs
export const getDashboardRecentLogs = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 10, 100);

    const result = await pool.query(`
      SELECT
        wl.id,
        wl.job_code,
        p.picker_code,
        p.name as picker_name,
        p.phone as picker_phone,
        wl.waste_type,
        wl.estimated_kg,
        wl.verified_kg,
        wl.status,
        cp.name as collection_point_name,
        cp.division,
        wl.logged_at,
        wl.verified_at,
        COALESCE(e.amount, 0) as earning_amount,
        e.status as earning_status
      FROM waste_logs wl
      JOIN pickers p ON wl.picker_id = p.id
      JOIN collection_points cp ON wl.collection_point_id = cp.id
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      ORDER BY wl.created_at DESC
      LIMIT $1
    `, [safeLimit]);

    const logs = result.rows.map(row => ({
      id: row.id,
      job_code: row.job_code,
      picker_code: row.picker_code,
      picker_name: row.picker_name,
      picker_phone: row.picker_phone,
      waste_type: row.waste_type,
      estimated_kg: parseFloat(row.estimated_kg),
      verified_kg: row.verified_kg ? parseFloat(row.verified_kg) : null,
      status: row.status,
      collection_point_name: row.collection_point_name,
      division: row.division,
      logged_at: row.logged_at,
      verified_at: row.verified_at,
      earning_amount: parseInt(row.earning_amount),
      earning_status: row.earning_status,
    }));

    sendSuccess(res, "Recent waste logs fetched successfully", logs);
  } catch (error) {
    console.error("[Dashboard Recent Logs Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/dashboard/waste-types - Waste performance by type
export const getDashboardWasteTypes = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        wl.waste_type,
        COUNT(wl.id) as total_logs,
        COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) as pending_logs,
        COUNT(CASE WHEN wl.status = 'VERIFIED' THEN 1 END) as verified_logs,
        COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) as rejected_logs,
        COUNT(CASE WHEN wl.status = 'PAID' THEN 1 END) as paid_logs,
        COALESCE(SUM(wl.estimated_kg), 0) as total_estimated_kg,
        COALESCE(SUM(wl.verified_kg), 0) as total_verified_kg,
        COALESCE(SUM(${sqlOriginalEarningAmount('e')}), 0) as total_earnings
      FROM waste_logs wl
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      WHERE wl.verified_at IS NOT NULL
      GROUP BY wl.waste_type
      ORDER BY total_verified_kg DESC
    `);

    const wasteTypes = result.rows.map(row => ({
      waste_type: row.waste_type,
      total_logs: parseInt(row.total_logs),
      pending_logs: parseInt(row.pending_logs),
      verified_logs: parseInt(row.verified_logs),
      rejected_logs: parseInt(row.rejected_logs),
      paid_logs: parseInt(row.paid_logs),
      total_estimated_kg: parseFloat(row.total_estimated_kg),
      total_verified_kg: parseFloat(row.total_verified_kg),
      total_earnings: parseInt(row.total_earnings),
    }));

    sendSuccess(res, "Waste type statistics fetched successfully", wasteTypes);
  } catch (error) {
    console.error("[Dashboard Waste Types Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/dashboard/top-pickers - Top performing pickers
export const getDashboardTopPickers = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 10, 100);

    const result = await pool.query(`
      SELECT
        p.id as picker_id,
        p.picker_code,
        p.name,
        p.phone,
        p.gender,
        p.age_group,
        p.division,
        COALESCE(SUM(wl.verified_kg), 0) as total_verified_kg,
        COALESCE(SUM(${sqlOriginalEarningAmount('e')}), 0) as total_earnings,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as verified_jobs
      FROM pickers p
      LEFT JOIN waste_logs wl ON p.id = wl.picker_id AND wl.verified_at IS NOT NULL
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY p.id, p.picker_code, p.name, p.phone, p.gender, p.age_group, p.division
      HAVING COALESCE(SUM(wl.verified_kg), 0) > 0
      ORDER BY total_verified_kg DESC
      LIMIT $1
    `, [safeLimit]);

    const topPickers = result.rows.map(row => ({
      picker_id: row.picker_id,
      picker_code: row.picker_code,
      name: row.name,
      phone: row.phone,
      gender: row.gender,
      age_group: row.age_group,
      division: row.division,
      total_verified_kg: parseFloat(row.total_verified_kg),
      total_earnings: parseInt(row.total_earnings),
      verified_jobs: parseInt(row.verified_jobs),
    }));

    sendSuccess(res, "Top pickers fetched successfully", topPickers);
  } catch (error) {
    console.error("[Dashboard Top Pickers Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/dashboard/collection-point-performance - Performance by collection point
export const getDashboardCollectionPointPerformance = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        cp.id as collection_point_id,
        cp.point_code,
        cp.name,
        cp.division,
        cp.agent_name,
        cp.agent_phone,
        COUNT(wl.id) as total_logs,
        COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) as pending_logs,
        COUNT(CASE WHEN wl.status = 'VERIFIED' THEN 1 END) as verified_logs,
        COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) as rejected_logs,
        COUNT(CASE WHEN wl.status = 'PAID' THEN 1 END) as paid_logs,
        COALESCE(SUM(wl.verified_kg), 0) as total_verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM collection_points cp
      LEFT JOIN waste_logs wl ON cp.id = wl.collection_point_id
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY cp.id, cp.point_code, cp.name, cp.division, cp.agent_name, cp.agent_phone
      ORDER BY total_verified_kg DESC
    `);

    const cpPerformance = result.rows.map(row => ({
      collection_point_id: row.collection_point_id,
      point_code: row.point_code,
      name: row.name,
      division: row.division,
      agent_name: row.agent_name,
      agent_phone: row.agent_phone,
      total_logs: parseInt(row.total_logs),
      pending_logs: parseInt(row.pending_logs),
      verified_logs: parseInt(row.verified_logs),
      rejected_logs: parseInt(row.rejected_logs),
      paid_logs: parseInt(row.paid_logs),
      total_verified_kg: parseFloat(row.total_verified_kg),
      total_earnings: parseInt(row.total_earnings),
    }));

    sendSuccess(res, "Collection point performance fetched successfully", cpPerformance);
  } catch (error) {
    console.error("[Dashboard CP Performance Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/dashboard/today - Today's activity
export const getDashboardToday = async (req, res, next) => {
  try {
    const city = resolveDashboardCity(req);
    const cityFilter = buildCityFilterClause(city, 1);
    const params = [...cityFilter.params];

    const wasteResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE (wl.logged_at AT TIME ZONE '${UGANDA_TZ}')::date = ${todayInUganda}
        ) AS logs_submitted,
        COUNT(*) FILTER (
          WHERE wl.status IN ('VERIFIED', 'PAID')
            AND wl.verified_at IS NOT NULL
            AND (wl.verified_at AT TIME ZONE '${UGANDA_TZ}')::date = ${todayInUganda}
        ) AS logs_verified,
        COUNT(*) FILTER (
          WHERE wl.status = 'PENDING'
            AND (wl.logged_at AT TIME ZONE '${UGANDA_TZ}')::date = ${todayInUganda}
        ) AS pending_today,
        COUNT(*) FILTER (
          WHERE wl.status = 'REJECTED'
            AND (wl.logged_at AT TIME ZONE '${UGANDA_TZ}')::date = ${todayInUganda}
        ) AS rejected_today,
        COALESCE(SUM(wl.verified_kg) FILTER (
          WHERE wl.status IN ('VERIFIED', 'PAID')
            AND wl.verified_at IS NOT NULL
            AND (wl.verified_at AT TIME ZONE '${UGANDA_TZ}')::date = ${todayInUganda}
        ), 0) AS weight_today,
        COUNT(DISTINCT wl.picker_id) FILTER (
          WHERE (wl.logged_at AT TIME ZONE '${UGANDA_TZ}')::date = ${todayInUganda}
        ) AS active_pickers_today
      FROM waste_logs wl
      JOIN collection_points cp ON cp.id = wl.collection_point_id
      WHERE 1=1
      ${cityFilter.clause}
      `,
      params
    );

    const earningsResult = await pool.query(
      `
      SELECT COALESCE(SUM(${sqlOriginalEarningAmount('e')}), 0) AS earnings_today
      FROM earnings e
      JOIN waste_logs wl ON wl.id = e.waste_log_id
      JOIN collection_points cp ON cp.id = wl.collection_point_id
      WHERE wl.verified_at IS NOT NULL
        AND (wl.verified_at AT TIME ZONE '${UGANDA_TZ}')::date = ${todayInUganda}
      ${cityFilter.clause}
      `,
      params
    );

    const todayStats = wasteResult.rows[0];
    const earningsToday = earningsResult.rows[0]?.earnings_today ?? 0;

    sendSuccess(res, "Today's activity fetched successfully", {
      logs_submitted: parseInt(todayStats.logs_submitted, 10) || 0,
      logs_verified: parseInt(todayStats.logs_verified, 10) || 0,
      pending_today: parseInt(todayStats.pending_today, 10) || 0,
      rejected_today: parseInt(todayStats.rejected_today, 10) || 0,
      weight_today: parseFloat(todayStats.weight_today) || 0,
      earnings_today: parseInt(earningsToday, 10) || 0,
      active_pickers_today: parseInt(todayStats.active_pickers_today, 10) || 0,
      // Legacy aliases kept for older clients
      logs_today: parseInt(todayStats.logs_submitted, 10) || 0,
      verified_today: parseInt(todayStats.logs_verified, 10) || 0,
      verified_kg_today: parseFloat(todayStats.weight_today) || 0,
    });
  } catch (error) {
    console.error("[Dashboard Today Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

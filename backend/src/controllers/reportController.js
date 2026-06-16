import pool from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  sqlVerifiedKgSum,
  sqlEstimatedKgSum,
  sqlPendingEstimatedKgSum,
} from "../utils/reportQueries.js";

// Helper: Parse month parameter (YYYY-MM format)
const parseMonth = (monthParam) => {
  if (!monthParam) {
    // Use current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    monthParam = `${year}-${month}`;
  }

  const [year, month] = monthParam.split("-");
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  return {
    month: monthParam,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

// Helper: Calculate percentage
const calcPercentage = (value, total) => {
  return total > 0 ? Math.round((value / total) * 100) : 0;
};

// GET /api/reports/monthly - Monthly summary report
export const getMonthlyReport = async (req, res, next) => {
  try {
    const { month } = req.query;
    const { month: reportMonth, startDate, endDate } = parseMonth(month);

    // Get all pickers in the system
    const pickersResult = await pool.query(`
      SELECT
        COUNT(*) as total_pickers,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_pickers,
        COUNT(CASE WHEN LOWER(gender) = 'female' THEN 1 END) as women_pickers,
        COUNT(CASE WHEN LOWER(gender) = 'male' THEN 1 END) as men_pickers,
        COUNT(CASE WHEN age_group IN ('Below 18', '18-24', '25-35') THEN 1 END) as youth_pickers
      FROM pickers
    `);

    const {
      total_pickers,
      active_pickers,
      women_pickers,
      men_pickers,
      youth_pickers,
    } = pickersResult.rows[0];

    // Get collection points
    const cpResult = await pool.query(`
      SELECT
        COUNT(*) as total_collection_points,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_collection_points
      FROM collection_points
    `);

    const {
      total_collection_points,
      active_collection_points,
    } = cpResult.rows[0];

    // Get waste logs for the month
    const wasteLogsResult = await pool.query(`
      SELECT
        COUNT(*) as total_waste_logs,
        COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) as pending_logs,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as verified_logs,
        COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) as rejected_logs,
        COUNT(CASE WHEN wl.status = 'PAID' THEN 1 END) as paid_logs,
        COALESCE(SUM(CASE WHEN wl.status != 'REJECTED' THEN wl.estimated_kg ELSE 0 END), 0) as total_estimated_kg,
        ${sqlVerifiedKgSum('wl')} as total_verified_kg,
        ${sqlPendingEstimatedKgSum('wl')} as pending_unverified_kg
      FROM waste_logs wl
      WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
    `, [startDate, endDate]);

    const {
      total_waste_logs,
      pending_logs,
      verified_logs,
      rejected_logs,
      paid_logs,
      total_estimated_kg,
      total_verified_kg,
      pending_unverified_kg,
    } = wasteLogsResult.rows[0];

    // Get earnings for the month
    const earningsResult = await pool.query(`
      SELECT
        COALESCE(SUM(e.amount), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN e.status = 'PENDING' THEN e.amount ELSE 0 END), 0) as pending_earnings,
        COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) as paid_earnings
      FROM earnings e
      JOIN waste_logs wl ON e.waste_log_id = wl.id
      WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
    `, [startDate, endDate]);

    const {
      total_earnings,
      pending_earnings,
      paid_earnings,
    } = earningsResult.rows[0];

    // Get waste type breakdown for the month
    const wasteTypeBreakdownResult = await pool.query(`
      SELECT
        wl.waste_type,
        COUNT(*) as total_logs,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as verified_logs,
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as total_verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM waste_logs wl
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      GROUP BY wl.waste_type
      ORDER BY total_verified_kg DESC
    `, [startDate, endDate]);

    // Get division breakdown for the month
    const divisionBreakdownResult = await pool.query(`
      SELECT
        p.division,
        COUNT(DISTINCT p.id) as total_pickers,
        COUNT(DISTINCT wl.id) as total_logs,
        COUNT(DISTINCT CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.id END) as verified_logs,
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as total_verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM pickers p
      LEFT JOIN waste_logs wl ON p.id = wl.picker_id AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY p.division
      ORDER BY p.division ASC
    `, [startDate, endDate]);

    // Get collection point breakdown for the month
    const cpBreakdownResult = await pool.query(`
      SELECT
        cp.id as collection_point_id,
        cp.point_code,
        cp.name,
        cp.division,
        COUNT(wl.id) as total_logs,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as verified_logs,
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as total_verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM collection_points cp
      LEFT JOIN waste_logs wl ON cp.id = wl.collection_point_id AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY cp.id, cp.point_code, cp.name, cp.division
      ORDER BY total_verified_kg DESC
    `, [startDate, endDate]);

    // Get top pickers for the month
    const topPickersResult = await pool.query(`
      SELECT
        p.id as picker_id,
        p.picker_code,
        p.name,
        p.phone,
        p.gender,
        p.age_group,
        p.division,
        COUNT(wl.id) as verified_jobs,
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as total_verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM pickers p
      LEFT JOIN waste_logs wl ON p.id = wl.picker_id AND wl.status IN ('VERIFIED', 'PAID') AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY p.id, p.picker_code, p.name, p.phone, p.gender, p.age_group, p.division
      HAVING COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) > 0
      ORDER BY total_verified_kg DESC
      LIMIT 10
    `, [startDate, endDate]);

    // Get recent verified logs for the month
    const recentLogsResult = await pool.query(`
      SELECT
        wl.id,
        wl.job_code,
        p.picker_code,
        p.name as picker_name,
        wl.waste_type,
        wl.verified_kg,
        wl.status,
        cp.name as collection_point_name,
        wl.verified_at,
        COALESCE(e.amount, 0) as earning_amount
      FROM waste_logs wl
      JOIN pickers p ON wl.picker_id = p.id
      JOIN collection_points cp ON wl.collection_point_id = cp.id
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      WHERE wl.status IN ('VERIFIED', 'PAID') AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      ORDER BY wl.verified_at DESC
      LIMIT 20
    `, [startDate, endDate]);

    sendSuccess(res, `Monthly report for ${reportMonth} fetched successfully`, {
      report_month: reportMonth,
      reporting_period_start: startDate,
      reporting_period_end: endDate,
      total_pickers: parseInt(total_pickers),
      active_pickers: parseInt(active_pickers),
      women_pickers: parseInt(women_pickers),
      men_pickers: parseInt(men_pickers),
      youth_pickers: parseInt(youth_pickers),
      women_percentage: calcPercentage(women_pickers, total_pickers),
      youth_percentage: calcPercentage(youth_pickers, total_pickers),
      total_collection_points: parseInt(total_collection_points),
      active_collection_points: parseInt(active_collection_points),
      total_waste_logs: parseInt(total_waste_logs),
      pending_logs: parseInt(pending_logs),
      verified_logs: parseInt(verified_logs),
      rejected_logs: parseInt(rejected_logs),
      paid_logs: parseInt(paid_logs),
      total_estimated_kg: parseFloat(total_estimated_kg),
      total_verified_kg: parseFloat(total_verified_kg),
      pending_unverified_kg: parseFloat(pending_unverified_kg),
      total_earnings: parseInt(total_earnings),
      pending_earnings: parseInt(pending_earnings),
      paid_earnings: parseInt(paid_earnings),
      waste_type_breakdown: wasteTypeBreakdownResult.rows.map(row => ({
        waste_type: row.waste_type,
        total_logs: parseInt(row.total_logs),
        verified_logs: parseInt(row.verified_logs),
        total_verified_kg: parseFloat(row.total_verified_kg),
        total_earnings: parseInt(row.total_earnings),
      })),
      division_breakdown: divisionBreakdownResult.rows.map(row => ({
        division: row.division,
        total_pickers: parseInt(row.total_pickers),
        total_logs: parseInt(row.total_logs),
        verified_logs: parseInt(row.verified_logs),
        total_verified_kg: parseFloat(row.total_verified_kg),
        total_earnings: parseInt(row.total_earnings),
      })),
      collection_point_breakdown: cpBreakdownResult.rows.map(row => ({
        collection_point_id: row.collection_point_id,
        point_code: row.point_code,
        name: row.name,
        division: row.division,
        total_logs: parseInt(row.total_logs),
        verified_logs: parseInt(row.verified_logs),
        total_verified_kg: parseFloat(row.total_verified_kg),
        total_earnings: parseInt(row.total_earnings),
      })),
      top_pickers: topPickersResult.rows.map(row => ({
        picker_id: row.picker_id,
        picker_code: row.picker_code,
        name: row.name,
        phone: row.phone,
        gender: row.gender,
        age_group: row.age_group,
        division: row.division,
        verified_jobs: parseInt(row.verified_jobs),
        total_verified_kg: parseFloat(row.total_verified_kg),
        total_earnings: parseInt(row.total_earnings),
      })),
      recent_verified_logs: recentLogsResult.rows.map(row => ({
        id: row.id,
        job_code: row.job_code,
        picker_code: row.picker_code,
        picker_name: row.picker_name,
        waste_type: row.waste_type,
        verified_kg: parseFloat(row.verified_kg),
        status: row.status,
        collection_point_name: row.collection_point_name,
        verified_at: row.verified_at,
        earning_amount: parseInt(row.earning_amount),
      })),
    });
  } catch (error) {
    console.error("[Monthly Report Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/reports/summary - All-time platform summary
export const getPlatformSummary = async (req, res, next) => {
  try {
    // Get all-time picker stats
    const pickersResult = await pool.query(`
      SELECT
        COUNT(*) as total_pickers,
        COUNT(CASE WHEN LOWER(gender) = 'female' THEN 1 END) as women_pickers,
        COUNT(CASE WHEN age_group IN ('Below 18', '18-24', '25-35') THEN 1 END) as youth_pickers
      FROM pickers
    `);

    const {
      total_pickers,
      women_pickers,
      youth_pickers,
    } = pickersResult.rows[0];

    // Get collection points
    const cpResult = await pool.query(`
      SELECT COUNT(*) as total_collection_points
      FROM collection_points
    `);

    const { total_collection_points } = cpResult.rows[0];

    // Get all-time waste stats
    const wasteResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as total_verified_kg,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as total_verified_jobs,
        COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) as total_rejected_jobs
      FROM waste_logs wl
    `);

    const {
      total_verified_kg,
      total_verified_jobs,
      total_rejected_jobs,
    } = wasteResult.rows[0];

    // Get all-time earnings
    const earningsResult = await pool.query(`
      SELECT
        COALESCE(SUM(e.amount), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) as total_paid_earnings,
        COALESCE(SUM(CASE WHEN e.status = 'PENDING' THEN e.amount ELSE 0 END), 0) as total_pending_earnings
      FROM earnings e
    `);

    const {
      total_earnings,
      total_paid_earnings,
      total_pending_earnings,
    } = earningsResult.rows[0];

    // Get divisions covered
    const divisionsResult = await pool.query(`
      SELECT COUNT(DISTINCT division) as divisions_covered
      FROM pickers
      WHERE division IS NOT NULL
    `);

    const { divisions_covered } = divisionsResult.rows[0];

    // Get waste types collected
    const wasteTypesResult = await pool.query(`
      SELECT COUNT(DISTINCT waste_type) as waste_types_collected
      FROM waste_logs
      WHERE waste_type IS NOT NULL
    `);

    const { waste_types_collected } = wasteTypesResult.rows[0];

    sendSuccess(res, "Platform summary fetched successfully", {
      total_pickers: parseInt(total_pickers),
      total_collection_points: parseInt(total_collection_points),
      total_verified_kg: parseFloat(total_verified_kg),
      total_earnings: parseInt(total_earnings),
      total_paid_earnings: parseInt(total_paid_earnings),
      total_pending_earnings: parseInt(total_pending_earnings),
      total_verified_jobs: parseInt(total_verified_jobs),
      total_rejected_jobs: parseInt(total_rejected_jobs),
      women_pickers: parseInt(women_pickers),
      youth_pickers: parseInt(youth_pickers),
      divisions_covered: parseInt(divisions_covered),
      waste_types_collected: parseInt(waste_types_collected),
    });
  } catch (error) {
    console.error("[Platform Summary Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

// GET /api/reports/undp-pilot - UNDP-style pilot report
export const getUndpPilotReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    // Parse dates - use current month if not provided
    let startDate, endDate;
    if (start_date && end_date) {
      startDate = start_date;
      endDate = end_date;
    } else {
      // Use current month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      startDate = `${year}-${month}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      endDate = `${year}-${month}-${lastDay}`;
    }

    // Get all pilots/divisions
    const divisionsResult = await pool.query(`
      SELECT DISTINCT division FROM pickers WHERE division IS NOT NULL ORDER BY division
    `);

    const pilot_divisions = divisionsResult.rows.map(row => row.division);
    const pilot_city = pilot_divisions.length > 0 ? "Kampala" : "N/A";

    // Get inclusion metrics (all pickers in system)
    const inclusionResult = await pool.query(`
      SELECT
        COUNT(*) as registered_pickers,
        COUNT(CASE WHEN LOWER(gender) = 'female' THEN 1 END) as women_pickers,
        COUNT(CASE WHEN age_group IN ('Below 18', '18-24', '25-35') THEN 1 END) as youth_pickers
      FROM pickers
    `);

    const {
      registered_pickers,
      women_pickers,
      youth_pickers,
    } = inclusionResult.rows[0];

    const women_percentage = calcPercentage(women_pickers, registered_pickers);
    const youth_percentage = calcPercentage(youth_pickers, registered_pickers);

    // Get environmental impact for the period (estimated vs verified vs pending)
    const environmentalResult = await pool.query(`
      SELECT
        ${sqlEstimatedKgSum('wl')} as total_estimated_kg,
        ${sqlVerifiedKgSum('wl')} as verified_waste_kg,
        ${sqlPendingEstimatedKgSum('wl')} as pending_unverified_kg,
        COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) as rejected_logs,
        COALESCE(SUM(CASE WHEN wl.status = 'REJECTED' THEN COALESCE(wl.estimated_kg, 0) ELSE 0 END), 0) as rejected_estimated_kg
      FROM waste_logs wl
      WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
    `, [startDate, endDate]);

    const {
      total_estimated_kg,
      verified_waste_kg,
      pending_unverified_kg,
      rejected_logs: environmental_rejected_logs,
      rejected_estimated_kg,
    } = environmentalResult.rows[0];
    const verified_waste_tonnes = parseFloat((verified_waste_kg / 1000).toFixed(3));

    // Get waste type breakdown for the period
    const wasteTypeBreakdownResult = await pool.query(`
      SELECT
        wl.waste_type,
        COALESCE(SUM(CASE WHEN wl.status != 'REJECTED' THEN wl.estimated_kg ELSE 0 END), 0) as estimated_kg,
        ${sqlVerifiedKgSum('wl')} as verified_kg,
        COALESCE(SUM(CASE WHEN wl.status = 'PENDING' THEN wl.estimated_kg ELSE 0 END), 0) as pending_kg
      FROM waste_logs wl
      WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      GROUP BY wl.waste_type
      ORDER BY verified_kg DESC
    `, [startDate, endDate]);

    const waste_type_breakdown = wasteTypeBreakdownResult.rows.map(row => ({
      waste_type: row.waste_type,
      estimated_kg: parseFloat(row.estimated_kg),
      verified_kg: parseFloat(row.verified_kg),
      pending_kg: parseFloat(row.pending_kg),
    }));

    // Get livelihood impact for the period
    const livelihoodResult = await pool.query(`
      SELECT
        COALESCE(SUM(e.amount), 0) as total_earnings_generated,
        COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) as paid_earnings,
        COALESCE(SUM(CASE WHEN e.status = 'PENDING' THEN e.amount ELSE 0 END), 0) as pending_earnings
      FROM earnings e
      JOIN waste_logs wl ON e.waste_log_id = wl.id
      WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
    `, [startDate, endDate]);

    const {
      total_earnings_generated,
      paid_earnings,
      pending_earnings,
    } = livelihoodResult.rows[0];

    const average_earning_per_picker = registered_pickers > 0
      ? Math.round(total_earnings_generated / registered_pickers)
      : 0;

    // Get operations metrics for the period
    const operationsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT cp.id) as collection_points_active,
        COUNT(wl.id) as total_waste_logs,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as verified_logs,
        COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) as rejected_logs,
        COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) as pending_logs
      FROM collection_points cp
      LEFT JOIN waste_logs wl ON cp.id = wl.collection_point_id AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
    `, [startDate, endDate]);

    const {
      collection_points_active,
      total_waste_logs,
      verified_logs,
      rejected_logs,
      pending_logs,
    } = operationsResult.rows[0];

    // Get division performance for the period
    const divisionPerformanceResult = await pool.query(`
      SELECT
        p.division,
        COUNT(DISTINCT p.id) as pickers_count,
        COUNT(wl.id) as total_logs,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as verified_logs,
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM pickers p
      LEFT JOIN waste_logs wl ON p.id = wl.picker_id AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      WHERE p.division IS NOT NULL
      GROUP BY p.division
      ORDER BY p.division ASC
    `, [startDate, endDate]);

    const division_performance = divisionPerformanceResult.rows.map(row => ({
      division: row.division,
      pickers_count: parseInt(row.pickers_count),
      total_logs: parseInt(row.total_logs),
      verified_logs: parseInt(row.verified_logs),
      verified_kg: parseFloat(row.verified_kg),
      total_earnings: parseInt(row.total_earnings),
    }));

    // Get collection point performance for the period
    const cpPerformanceResult = await pool.query(`
      SELECT
        cp.id as collection_point_id,
        cp.point_code,
        cp.name,
        cp.division,
        cp.agent_name,
        COUNT(wl.id) as total_logs,
        COUNT(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN 1 END) as verified_logs,
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM collection_points cp
      LEFT JOIN waste_logs wl ON cp.id = wl.collection_point_id AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY cp.id, cp.point_code, cp.name, cp.division, cp.agent_name
      ORDER BY verified_kg DESC
    `, [startDate, endDate]);

    const collection_point_performance = cpPerformanceResult.rows.map(row => ({
      collection_point_id: row.collection_point_id,
      point_code: row.point_code,
      name: row.name,
      division: row.division,
      agent_name: row.agent_name,
      total_logs: parseInt(row.total_logs),
      verified_logs: parseInt(row.verified_logs),
      verified_kg: parseFloat(row.verified_kg),
      total_earnings: parseInt(row.total_earnings),
    }));

    // Get top pickers for the period
    const topPickersResult = await pool.query(`
      SELECT
        p.id as picker_id,
        p.picker_code,
        p.name,
        p.phone,
        p.gender,
        p.age_group,
        p.division,
        COUNT(wl.id) as verified_jobs,
        COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) as verified_kg,
        COALESCE(SUM(e.amount), 0) as total_earnings
      FROM pickers p
      LEFT JOIN waste_logs wl ON p.id = wl.picker_id AND wl.status IN ('VERIFIED', 'PAID') AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
      LEFT JOIN earnings e ON wl.id = e.waste_log_id
      GROUP BY p.id, p.picker_code, p.name, p.phone, p.gender, p.age_group, p.division
      HAVING COALESCE(SUM(CASE WHEN wl.status IN ('VERIFIED', 'PAID') THEN wl.verified_kg ELSE 0 END), 0) > 0
      ORDER BY verified_kg DESC
      LIMIT 10
    `, [startDate, endDate]);

    const top_pickers = topPickersResult.rows.map(row => ({
      picker_id: row.picker_id,
      picker_code: row.picker_code,
      name: row.name,
      phone: row.phone,
      gender: row.gender,
      age_group: row.age_group,
      division: row.division,
      verified_jobs: parseInt(row.verified_jobs),
      verified_kg: parseFloat(row.verified_kg),
      total_earnings: parseInt(row.total_earnings),
    }));

    sendSuccess(res, "UNDP pilot report generated successfully", {
      pilot_city,
      pilot_divisions,
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      inclusion: {
        registered_pickers: parseInt(registered_pickers),
        women_pickers: parseInt(women_pickers),
        youth_pickers: parseInt(youth_pickers),
        women_percentage,
        youth_percentage,
      },
      environmental_impact: {
        total_estimated_kg: parseFloat(total_estimated_kg),
        verified_waste_kg: parseFloat(verified_waste_kg),
        pending_unverified_kg: parseFloat(pending_unverified_kg),
        rejected_logs: parseInt(environmental_rejected_logs),
        rejected_estimated_kg: parseFloat(rejected_estimated_kg),
        verified_waste_tonnes,
        waste_type_breakdown,
      },
      livelihood_impact: {
        total_earnings_generated: parseInt(total_earnings_generated),
        paid_earnings: parseInt(paid_earnings),
        pending_earnings: parseInt(pending_earnings),
        average_earning_per_picker,
      },
      operations: {
        collection_points_active: parseInt(collection_points_active),
        total_waste_logs: parseInt(total_waste_logs),
        verified_logs: parseInt(verified_logs),
        rejected_logs: parseInt(rejected_logs),
        pending_logs: parseInt(pending_logs),
      },
      division_performance,
      collection_point_performance,
      top_pickers,
    });
  } catch (error) {
    console.error("[UNDP Pilot Report Error]", { code: error.code, message: error.message });
    sendError(res, "Database connection failed. Please check Neon DATABASE_URL or network configuration.", 503);
  }
};

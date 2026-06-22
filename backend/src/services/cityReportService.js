import pool from '../config/db.js';
import { ensureWithdrawalTables } from './payment/withdrawalService.js';
import {
  sqlEstimatedKgSum,
  sqlPendingEstimatedKgSum,
  sqlVerifiedKgSum,
  VERIFIED_LOG_STATUSES,
} from '../utils/reportQueries.js';
import { SQL_CONFIRMED_EARNING_STATUSES } from '../utils/paymentStatus.js';
import { buildScopedLogSql, formatCityLabel, parseReportFilters } from './cityReportFilters.js';

const calcPercentage = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

const num = (value) => Number(value) || 0;
const int = (value) => parseInt(value, 10) || 0;

const baseLogJoins = `
  FROM waste_logs wl
  JOIN pickers p ON wl.picker_id = p.id
  JOIN collection_points cp ON wl.collection_point_id = cp.id
  LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
  LEFT JOIN reporting_categories rc ON wl.reporting_category_id = rc.id
  LEFT JOIN earnings e ON e.waste_log_id = wl.id
`;

export const listReportCities = async () => {
  const result = await pool.query(`
    SELECT DISTINCT city FROM city_waste_types
    WHERE city IS NOT NULL AND TRIM(city) != ''
    ORDER BY city ASC
  `);
  return result.rows.map((row) => row.city);
};

export const getReportFilterOptions = async (city) => {
  const normalizedCity = String(city).trim().toLowerCase();

  const [collectionPoints, wasteTypes] = await Promise.all([
    pool.query(
      `SELECT DISTINCT cp.id, cp.point_code, cp.name, cp.division
       FROM collection_points cp
       WHERE cp.status = 'ACTIVE'
         AND (
           EXISTS (
             SELECT 1 FROM waste_logs wl
             JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
             WHERE wl.collection_point_id = cp.id AND LOWER(cwt.city) = LOWER($1)
           )
           OR EXISTS (
             SELECT 1 FROM city_waste_types cwt WHERE LOWER(cwt.city) = LOWER($1)
           )
         )
       ORDER BY cp.name ASC`,
      [normalizedCity]
    ),
    pool.query(
      `SELECT id, name, slug, reporting_category_id
       FROM city_waste_types
       WHERE LOWER(city) = LOWER($1) AND is_active = TRUE
       ORDER BY name ASC`,
      [normalizedCity]
    ),
  ]);

  return {
    city: normalizedCity,
    collection_points: collectionPoints.rows,
    waste_types: wasteTypes.rows,
    genders: ['female', 'male', 'other'],
  };
};

export const buildCityReportPack = async (query, user) => {
  const filters = parseReportFilters(query, user);
  const { startDate, endDate } = filters;
  const scope = buildScopedLogSql(filters, 3);
  const baseParams = [startDate, endDate, ...scope.params];
  const scopeWhere = scope.whereSql;

  await ensureWithdrawalTables(pool);

  const [
    summaryResult,
    wasteByTypeResult,
    wasteByCpResult,
    pickerParticipationResult,
    earningsResult,
    withdrawalsResult,
    agentVerificationResult,
    reportingCategoryResult,
    rawDataResult,
    divisionsResult,
  ] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(DISTINCT p.id) AS registered_pickers,
         COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END) AS active_pickers,
         COUNT(DISTINCT CASE WHEN LOWER(p.gender) = 'female' THEN p.id END) AS women_pickers,
         COUNT(DISTINCT CASE WHEN p.age_group IN ('Below 18', '18-24', '25-35') THEN p.id END) AS youth_pickers,
         COUNT(wl.id) AS total_waste_logs,
         COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) AS pending_logs,
         COUNT(CASE WHEN wl.status IN ${VERIFIED_LOG_STATUSES} THEN 1 END) AS verified_logs,
         COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) AS rejected_logs,
         ${sqlEstimatedKgSum('wl')} AS total_estimated_kg,
         ${sqlVerifiedKgSum('wl')} AS total_verified_kg,
         ${sqlPendingEstimatedKgSum('wl')} AS pending_unverified_kg,
         COALESCE(SUM(CASE WHEN wl.status = 'REJECTED' THEN COALESCE(wl.estimated_kg, 0) ELSE 0 END), 0) AS rejected_estimated_kg,
         COALESCE(SUM(CASE WHEN e.status IN ${SQL_CONFIRMED_EARNING_STATUSES} THEN e.amount ELSE 0 END), 0) AS confirmed_earnings,
         COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) AS paid_earnings,
         COALESCE(SUM(CASE WHEN e.status IN ('AVAILABLE','PAYOUT_PROCESSING') THEN e.amount ELSE 0 END), 0) AS in_flight_earnings,
         COUNT(DISTINCT cp.id) AS active_collection_points
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}`,
      baseParams
    ),
    pool.query(
      `SELECT
         COALESCE(cwt.name, wl.waste_type) AS waste_type_name,
         COALESCE(rc.name, 'Uncategorized') AS reporting_category,
         COUNT(wl.id) AS total_logs,
         COUNT(CASE WHEN wl.status IN ${VERIFIED_LOG_STATUSES} THEN 1 END) AS verified_logs,
         COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) AS pending_logs,
         COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) AS rejected_logs,
         COALESCE(SUM(CASE WHEN wl.status != 'REJECTED' THEN wl.estimated_kg ELSE 0 END), 0) AS estimated_kg,
         ${sqlVerifiedKgSum('wl')} AS verified_kg,
         COALESCE(SUM(CASE WHEN e.status IN ${SQL_CONFIRMED_EARNING_STATUSES} THEN e.amount ELSE 0 END), 0) AS total_earnings
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}
       GROUP BY COALESCE(cwt.name, wl.waste_type), COALESCE(rc.name, 'Uncategorized')
       ORDER BY verified_kg DESC`,
      baseParams
    ),
    pool.query(
      `SELECT
         cp.id AS collection_point_id,
         cp.point_code,
         cp.name AS collection_point_name,
         cp.division,
         cp.agent_name,
         COUNT(wl.id) AS total_logs,
         COUNT(CASE WHEN wl.status IN ${VERIFIED_LOG_STATUSES} THEN 1 END) AS verified_logs,
         COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) AS pending_logs,
         COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) AS rejected_logs,
         COALESCE(SUM(CASE WHEN wl.status != 'REJECTED' THEN wl.estimated_kg ELSE 0 END), 0) AS estimated_kg,
         ${sqlVerifiedKgSum('wl')} AS verified_kg,
         COALESCE(SUM(CASE WHEN e.status IN ${SQL_CONFIRMED_EARNING_STATUSES} THEN e.amount ELSE 0 END), 0) AS total_earnings
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}
       GROUP BY cp.id, cp.point_code, cp.name, cp.division, cp.agent_name
       ORDER BY verified_kg DESC`,
      baseParams
    ),
    pool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(p.gender), ''), 'Unknown') AS gender,
         COALESCE(NULLIF(TRIM(p.age_group), ''), 'Unknown') AS age_group,
         COUNT(DISTINCT p.id) AS pickers,
         COUNT(wl.id) AS total_logs,
         COUNT(CASE WHEN wl.status IN ${VERIFIED_LOG_STATUSES} THEN 1 END) AS verified_logs,
         ${sqlVerifiedKgSum('wl')} AS verified_kg,
         COALESCE(SUM(CASE WHEN e.status IN ${SQL_CONFIRMED_EARNING_STATUSES} THEN e.amount ELSE 0 END), 0) AS total_earnings
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}
       GROUP BY COALESCE(NULLIF(TRIM(p.gender), ''), 'Unknown'), COALESCE(NULLIF(TRIM(p.age_group), ''), 'Unknown')
       ORDER BY verified_kg DESC`,
      baseParams
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN e.status IN ${SQL_CONFIRMED_EARNING_STATUSES} THEN e.amount ELSE 0 END), 0) AS confirmed_earnings,
         COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) AS paid_earnings,
         COALESCE(SUM(CASE WHEN e.status IN ('AVAILABLE','PAYOUT_PROCESSING') THEN e.amount ELSE 0 END), 0) AS in_flight_earnings,
         COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN e.id END) AS earning_records
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}`,
      baseParams
    ),
    pool.query(
      `SELECT
         wr.id,
         p.picker_code,
         p.name AS picker_name,
         p.gender,
         p.age_group,
         wr.provider,
         wr.phone,
         wr.amount,
         wr.status,
         wr.payment_reference,
         wr.created_at,
         wr.completed_at
       FROM withdrawal_requests wr
       JOIN pickers p ON wr.picker_id = p.id
       WHERE DATE(wr.created_at) >= $1 AND DATE(wr.created_at) <= $2
         AND EXISTS (
           SELECT 1
           FROM waste_logs wl
           JOIN pickers px ON wl.picker_id = px.id
           JOIN collection_points cp ON wl.collection_point_id = cp.id
           LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
           WHERE px.id = p.id
             AND DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
             ${scopeWhere}
         )
       ORDER BY wr.created_at DESC`,
      baseParams
    ),
    pool.query(
      `SELECT
         cp.point_code,
         cp.name AS collection_point_name,
         cp.division,
         cp.agent_name,
         COUNT(wl.id) AS total_logs,
         COUNT(CASE WHEN wl.status = 'PENDING' THEN 1 END) AS pending_logs,
         COUNT(CASE WHEN wl.status IN ${VERIFIED_LOG_STATUSES} THEN 1 END) AS verified_logs,
         COUNT(CASE WHEN wl.status = 'REJECTED' THEN 1 END) AS rejected_logs,
         ROUND(
           100.0 * COUNT(CASE WHEN wl.status IN ${VERIFIED_LOG_STATUSES} THEN 1 END)
           / NULLIF(COUNT(wl.id), 0),
           1
         ) AS verification_rate_pct,
         ${sqlVerifiedKgSum('wl')} AS verified_kg,
         COALESCE(AVG(EXTRACT(EPOCH FROM (wl.verified_at - wl.logged_at)) / 3600.0)
           FILTER (WHERE wl.verified_at IS NOT NULL), 0) AS avg_hours_to_verify
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}
       GROUP BY cp.point_code, cp.name, cp.division, cp.agent_name
       ORDER BY verified_logs DESC`,
      baseParams
    ),
    pool.query(
      `SELECT
         COALESCE(rc.name, 'Uncategorized') AS reporting_category_name,
         COALESCE(SUM(CASE WHEN wl.status != 'REJECTED' THEN wl.estimated_kg ELSE 0 END), 0) AS estimated_kg,
         ${sqlVerifiedKgSum('wl')} AS verified_kg,
         COALESCE(SUM(CASE WHEN wl.status = 'PENDING' THEN wl.estimated_kg ELSE 0 END), 0) AS pending_kg,
         COALESCE(SUM(CASE WHEN wl.status = 'REJECTED' THEN COALESCE(wl.estimated_kg, 0) ELSE 0 END), 0) AS rejected_kg,
         COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) AS paid_earnings
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}
       GROUP BY COALESCE(rc.name, 'Uncategorized')
       ORDER BY verified_kg DESC`,
      baseParams
    ),
    pool.query(
      `SELECT
         wl.job_code,
         wl.logged_at,
         wl.verified_at,
         wl.status,
         wl.waste_type,
         COALESCE(cwt.name, wl.waste_type) AS city_waste_type_name,
         COALESCE(rc.name, 'Uncategorized') AS reporting_category,
         wl.estimated_kg,
         wl.verified_kg,
         p.picker_code,
         p.name AS picker_name,
         p.gender,
         p.age_group,
         p.division AS picker_division,
         cp.point_code,
         cp.name AS collection_point_name,
         cp.division,
         cp.agent_name,
         COALESCE(e.amount, 0) AS earning_amount,
         COALESCE(e.status, 'NONE') AS earning_status
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scopeWhere}
       ORDER BY wl.logged_at DESC
       LIMIT 10000`,
      baseParams
    ),
    pool.query(
      `SELECT DISTINCT cp.division
       ${baseLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
         ${scopeWhere}
         AND cp.division IS NOT NULL
       ORDER BY cp.division ASC`,
      baseParams
    ),
  ]);

  const summary = summaryResult.rows[0] || {};
  const registeredPickers = int(summary.registered_pickers);
  const womenPickers = int(summary.women_pickers);
  const youthPickers = int(summary.youth_pickers);
  const totalVerifiedKg = num(summary.total_verified_kg);
  const totalEstimatedKg = num(summary.total_estimated_kg);
  const pendingUnverifiedKg = num(summary.pending_unverified_kg);
  const rejectedEstimatedKg = num(summary.rejected_estimated_kg);
  const confirmedEarnings = int(summary.confirmed_earnings);
  const paidEarnings = int(summary.paid_earnings);
  const inFlightEarnings = int(summary.in_flight_earnings);

  const withdrawalRows = withdrawalsResult.rows.map((row) => ({
    id: row.id,
    picker_code: row.picker_code,
    picker_name: row.picker_name,
    gender: row.gender,
    age_group: row.age_group,
    provider: row.provider,
    phone: row.phone,
    amount: int(row.amount),
    status: row.status,
    payment_reference: row.payment_reference,
    created_at: row.created_at,
    completed_at: row.completed_at,
  }));

  const withdrawalTotals = withdrawalRows.reduce(
    (acc, row) => {
      acc.total_amount += row.amount;
      if (row.status === 'SUCCESS') acc.success_amount += row.amount;
      if (row.status === 'PROCESSING') acc.processing_amount += row.amount;
      if (row.status === 'FAILED') acc.failed_amount += row.amount;
      acc.count += 1;
      return acc;
    },
    { count: 0, total_amount: 0, success_amount: 0, processing_amount: 0, failed_amount: 0 }
  );

  const wasteByType = wasteByTypeResult.rows.map((row) => ({
    waste_type_name: row.waste_type_name,
    reporting_category: row.reporting_category,
    total_logs: int(row.total_logs),
    verified_logs: int(row.verified_logs),
    pending_logs: int(row.pending_logs),
    rejected_logs: int(row.rejected_logs),
    estimated_kg: num(row.estimated_kg),
    verified_kg: num(row.verified_kg),
    total_earnings: int(row.total_earnings),
  }));

  const wasteByCollectionPoint = wasteByCpResult.rows.map((row) => ({
    collection_point_id: row.collection_point_id,
    point_code: row.point_code,
    collection_point_name: row.collection_point_name,
    division: row.division,
    agent_name: row.agent_name,
    total_logs: int(row.total_logs),
    verified_logs: int(row.verified_logs),
    pending_logs: int(row.pending_logs),
    rejected_logs: int(row.rejected_logs),
    estimated_kg: num(row.estimated_kg),
    verified_kg: num(row.verified_kg),
    total_earnings: int(row.total_earnings),
  }));

  const pickerParticipation = pickerParticipationResult.rows.map((row) => ({
    gender: row.gender,
    age_group: row.age_group,
    pickers: int(row.pickers),
    total_logs: int(row.total_logs),
    verified_logs: int(row.verified_logs),
    verified_kg: num(row.verified_kg),
    total_earnings: int(row.total_earnings),
  }));

  const agentVerification = agentVerificationResult.rows.map((row) => ({
    point_code: row.point_code,
    collection_point_name: row.collection_point_name,
    division: row.division,
    agent_name: row.agent_name,
    total_logs: int(row.total_logs),
    pending_logs: int(row.pending_logs),
    verified_logs: int(row.verified_logs),
    rejected_logs: int(row.rejected_logs),
    verification_rate_pct: num(row.verification_rate_pct),
    verified_kg: num(row.verified_kg),
    avg_hours_to_verify: num(row.avg_hours_to_verify),
  }));

  const reportingCategories = reportingCategoryResult.rows.map((row) => ({
    reporting_category_name: row.reporting_category_name,
    estimated_kg: num(row.estimated_kg),
    verified_kg: num(row.verified_kg),
    pending_kg: num(row.pending_kg),
    rejected_kg: num(row.rejected_kg),
    paid_earnings: int(row.paid_earnings),
  }));

  const rawData = rawDataResult.rows.map((row) => ({
    job_code: row.job_code,
    logged_at: row.logged_at,
    verified_at: row.verified_at,
    status: row.status,
    waste_type: row.waste_type,
    city_waste_type_name: row.city_waste_type_name,
    reporting_category: row.reporting_category,
    estimated_kg: num(row.estimated_kg),
    verified_kg: num(row.verified_kg),
    picker_code: row.picker_code,
    picker_name: row.picker_name,
    gender: row.gender,
    age_group: row.age_group,
    picker_division: row.picker_division,
    point_code: row.point_code,
    collection_point_name: row.collection_point_name,
    division: row.division,
    agent_name: row.agent_name,
    earning_amount: int(row.earning_amount),
    earning_status: row.earning_status,
  }));

  const pilotDivisions = divisionsResult.rows.map((row) => row.division).filter(Boolean);
  const verifiedWasteTonnes = parseFloat((totalVerifiedKg / 1000).toFixed(3));

  const undpNarrative = buildUndpNarrative({
    cityLabel: filters.cityLabel,
    periodLabel: filters.periodLabel,
    registeredPickers,
    womenPickers,
    womenPercentage: calcPercentage(womenPickers, registeredPickers),
    youthPickers,
    youthPercentage: calcPercentage(youthPickers, registeredPickers),
    totalVerifiedKg,
    verifiedWasteTonnes,
    totalEstimatedKg,
    pendingUnverifiedKg,
    rejectedEstimatedKg,
    confirmedEarnings,
    paidEarnings,
    activeCollectionPoints: int(summary.active_collection_points),
    verifiedLogs: int(summary.verified_logs),
  });

  return {
    meta: {
      generated_at: new Date().toISOString(),
      city: filters.city,
      city_label: filters.cityLabel,
      report_month: filters.reportMonth,
      reporting_period_start: startDate,
      reporting_period_end: endDate,
      period_label: filters.periodLabel,
      filters_applied: {
        collection_point_id: filters.collectionPointId,
        city_waste_type_id: filters.cityWasteTypeId,
        waste_type: filters.wasteType,
        gender: filters.gender,
        youth_only: filters.youthOnly,
      },
      raw_data_truncated: rawDataResult.rows.length >= 10000,
    },
    executive_summary: {
      registered_pickers: registeredPickers,
      active_pickers: int(summary.active_pickers),
      women_pickers: womenPickers,
      youth_pickers: youthPickers,
      women_percentage: calcPercentage(womenPickers, registeredPickers),
      youth_percentage: calcPercentage(youthPickers, registeredPickers),
      active_collection_points: int(summary.active_collection_points),
      pilot_divisions: pilotDivisions,
      total_waste_logs: int(summary.total_waste_logs),
      pending_logs: int(summary.pending_logs),
      verified_logs: int(summary.verified_logs),
      rejected_logs: int(summary.rejected_logs),
      total_estimated_kg: totalEstimatedKg,
      total_verified_kg: totalVerifiedKg,
      verified_waste_tonnes: verifiedWasteTonnes,
      pending_unverified_kg: pendingUnverifiedKg,
      rejected_estimated_kg: rejectedEstimatedKg,
      confirmed_earnings: confirmedEarnings,
      paid_earnings: paidEarnings,
      in_flight_earnings: inFlightEarnings,
      withdrawal_count: withdrawalTotals.count,
      withdrawal_total_amount: withdrawalTotals.total_amount,
      withdrawal_success_amount: withdrawalTotals.success_amount,
    },
    monthly: {
      waste_type_breakdown: wasteByType,
      collection_point_breakdown: wasteByCollectionPoint,
      picker_participation: pickerParticipation,
    },
    undp: {
      pilot_city: filters.cityLabel,
      pilot_divisions: pilotDivisions,
      period: { start_date: startDate, end_date: endDate },
      inclusion: {
        registered_pickers: registeredPickers,
        women_pickers: womenPickers,
        youth_pickers: youthPickers,
        women_percentage: calcPercentage(womenPickers, registeredPickers),
        youth_percentage: calcPercentage(youthPickers, registeredPickers),
      },
      environmental_impact: {
        total_estimated_kg: totalEstimatedKg,
        verified_waste_kg: totalVerifiedKg,
        pending_unverified_kg: pendingUnverifiedKg,
        rejected_estimated_kg: rejectedEstimatedKg,
        verified_waste_tonnes: verifiedWasteTonnes,
        reporting_category_breakdown: reportingCategories,
        waste_type_breakdown: wasteByType,
      },
      livelihood_impact: {
        total_earnings_generated: confirmedEarnings,
        paid_earnings: paidEarnings,
        in_flight_earnings: inFlightEarnings,
        average_earning_per_picker:
          registeredPickers > 0 ? Math.round(confirmedEarnings / registeredPickers) : 0,
        withdrawal_totals: withdrawalTotals,
      },
      operations: {
        collection_points_active: int(summary.active_collection_points),
        total_waste_logs: int(summary.total_waste_logs),
        verified_logs: int(summary.verified_logs),
        rejected_logs: int(summary.rejected_logs),
        pending_logs: int(summary.pending_logs),
      },
      collection_point_performance: wasteByCollectionPoint,
      narrative: undpNarrative,
    },
    sheets: {
      executive_summary: buildExecutiveSummaryRows(filters, summary, withdrawalTotals, pilotDivisions),
      waste_by_type: wasteByType,
      waste_by_collection_point: wasteByCollectionPoint,
      picker_participation: pickerParticipation,
      earnings_withdrawals: {
        earnings: {
          confirmed_earnings: confirmedEarnings,
          paid_earnings: paidEarnings,
          in_flight_earnings: inFlightEarnings,
        },
        withdrawals: withdrawalRows,
      },
      agent_verification: agentVerification,
      raw_data: rawData,
    },
  };
};

const buildExecutiveSummaryRows = (filters, summary, withdrawalTotals, pilotDivisions) => [
  { metric: 'Pilot city', value: filters.cityLabel },
  { metric: 'Reporting period', value: `${filters.startDate} to ${filters.endDate}` },
  { metric: 'Divisions covered', value: pilotDivisions.join(', ') || '—' },
  { metric: 'Registered pickers (active in period)', value: int(summary.registered_pickers) },
  { metric: 'Women pickers', value: int(summary.women_pickers) },
  { metric: 'Youth pickers', value: int(summary.youth_pickers) },
  { metric: 'Active collection points', value: int(summary.active_collection_points) },
  { metric: 'Total waste logs', value: int(summary.total_waste_logs) },
  { metric: 'Verified logs', value: int(summary.verified_logs) },
  { metric: 'Pending logs', value: int(summary.pending_logs) },
  { metric: 'Rejected logs', value: int(summary.rejected_logs) },
  { metric: 'Estimated kg (logged)', value: num(summary.total_estimated_kg) },
  { metric: 'Verified kg (agent confirmed)', value: num(summary.total_verified_kg) },
  { metric: 'Pending / unverified kg', value: num(summary.pending_unverified_kg) },
  { metric: 'Rejected estimated kg', value: num(summary.rejected_estimated_kg) },
  { metric: 'Confirmed earnings (UGX)', value: int(summary.confirmed_earnings) },
  { metric: 'Paid earnings (UGX)', value: int(summary.paid_earnings) },
  { metric: 'In-flight earnings (UGX)', value: int(summary.in_flight_earnings) },
  { metric: 'Withdrawals count', value: withdrawalTotals.count },
  { metric: 'Withdrawals total (UGX)', value: withdrawalTotals.total_amount },
  { metric: 'Withdrawals successful (UGX)', value: withdrawalTotals.success_amount },
];

const buildUndpNarrative = ({
  cityLabel,
  periodLabel,
  registeredPickers,
  womenPickers,
  womenPercentage,
  youthPickers,
  youthPercentage,
  totalVerifiedKg,
  verifiedWasteTonnes,
  totalEstimatedKg,
  pendingUnverifiedKg,
  rejectedEstimatedKg,
  confirmedEarnings,
  paidEarnings,
  activeCollectionPoints,
  verifiedLogs,
}) =>
  `During ${periodLabel}, the WasteLink pilot in ${cityLabel} engaged ${registeredPickers} waste pickers across ${activeCollectionPoints} collection points. Pickers logged an estimated ${totalEstimatedKg.toFixed(1)} kg of waste; agents verified ${totalVerifiedKg.toFixed(1)} kg (${verifiedWasteTonnes} tonnes) across ${verifiedLogs} jobs. Pending/unverified material totalled ${pendingUnverifiedKg.toFixed(1)} kg, while ${rejectedEstimatedKg.toFixed(1)} kg was rejected during verification. Inclusion outcomes included ${womenPickers} women (${womenPercentage}%) and ${youthPickers} youth (${youthPercentage}%) among active pickers. The platform generated UGX ${confirmedEarnings.toLocaleString('en-UG')} in confirmed picker earnings, with UGX ${paidEarnings.toLocaleString('en-UG')} paid out through mobile money withdrawals. This UNDP-aligned pilot report demonstrates how digital traceability links informal waste collection to measurable environmental recovery and livelihood creation in ${cityLabel}.`;

const scopedLogJoins = `
  FROM waste_logs wl
  JOIN pickers p ON wl.picker_id = p.id
  JOIN collection_points cp ON wl.collection_point_id = cp.id
  LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
`;

export const previewCityReportExport = async (query, user) => {
  const filters = parseReportFilters(query, user);
  const scope = buildScopedLogSql(filters, 3);
  const periodParams = [filters.startDate, filters.endDate, ...scope.params];
  const cityScope = buildScopedLogSql(filters, 1);

  const [periodResult, pilotResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(wl.id)::int AS total_waste_logs,
         ${sqlVerifiedKgSum('wl')} AS total_verified_kg
       ${scopedLogJoins}
       WHERE DATE(wl.logged_at) >= $1 AND DATE(wl.logged_at) <= $2
       ${scope.whereSql}`,
      periodParams
    ),
    pool.query(
      `SELECT
         MIN(wl.logged_at) AS pilot_started_at,
         COUNT(wl.id)::int AS all_time_logs
       ${scopedLogJoins}
       WHERE 1=1 ${cityScope.whereSql}`,
      cityScope.params
    ),
  ]);

  const totalWasteLogs = int(periodResult.rows[0]?.total_waste_logs);
  const totalVerifiedKg = num(periodResult.rows[0]?.total_verified_kg);
  const pilotStartedAt = pilotResult.rows[0]?.pilot_started_at || null;
  const allTimeLogs = int(pilotResult.rows[0]?.all_time_logs);

  const pilotStartedDate = pilotStartedAt
    ? new Date(pilotStartedAt).toISOString().split('T')[0]
    : null;

  const periodEndsBeforePilot =
    pilotStartedDate && filters.endDate < pilotStartedDate;

  return {
    city: filters.city,
    city_label: filters.cityLabel,
    reporting_period_start: filters.startDate,
    reporting_period_end: filters.endDate,
    period_label: filters.periodLabel,
    has_activity: totalWasteLogs > 0,
    total_waste_logs: totalWasteLogs,
    total_verified_kg: totalVerifiedKg,
    pilot_started_at: pilotStartedAt,
    pilot_started_date: pilotStartedDate,
    pilot_has_data: allTimeLogs > 0,
    period_before_pilot: periodEndsBeforePilot,
    message: totalWasteLogs
      ? null
      : periodEndsBeforePilot
        ? `No waste was logged in ${filters.cityLabel} during this period. Pilot activity for these filters started on ${pilotStartedDate}.`
        : allTimeLogs
          ? `No waste logs match your selected period and filters for ${filters.cityLabel}.`
          : `No waste has been logged yet for ${filters.cityLabel} with the current filters.`,
  };
};

export { formatCityLabel, parseReportFilters };

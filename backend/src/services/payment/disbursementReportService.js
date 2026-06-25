import pool from '../../config/db.js';
import { ensureWithdrawalTables } from './withdrawalService.js';
import {
  disbursementDateFilter,
  sqlOriginalEarningAmount,
  verifiedEarningsDateFilter,
} from '../../utils/earningReportQueries.js';

const int = (value) => parseInt(value, 10) || 0;

export const getVerifiedEarningsForPeriod = async (
  startDate,
  endDate,
  { scopeSql = '', scopeParams = [] } = {}
) => {
  const params = [startDate, endDate, ...scopeParams];

  const result = await pool.query(
    `SELECT COALESCE(SUM(${sqlOriginalEarningAmount('e')}), 0) AS verified_earnings
     FROM earnings e
     JOIN waste_logs wl ON e.waste_log_id = wl.id
     JOIN pickers p ON wl.picker_id = p.id
     JOIN collection_points cp ON wl.collection_point_id = cp.id
     LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
     WHERE wl.verified_at IS NOT NULL
       AND ${verifiedEarningsDateFilter('wl', '$1', '$2')}
       ${scopeSql}`,
    params
  );

  return int(result.rows[0]?.verified_earnings);
};

export const getDisbursementSummaryForPeriod = async (
  startDate,
  endDate,
  { scopeSql = '', scopeParams = [] } = {}
) => {
  await ensureWithdrawalTables(pool);

  const params = [startDate, endDate, ...scopeParams];
  const pickerScopeFilter = scopeSql
    ? `AND EXISTS (
         SELECT 1
         FROM waste_logs wl
         JOIN collection_points cp ON wl.collection_point_id = cp.id
         LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
         WHERE wl.picker_id = p.id
         ${scopeSql}
       )`
    : '';

  const [totalsResult, dailyResult] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN wr.status = 'SUCCESS' THEN wr.amount ELSE 0 END), 0) AS total_disbursed,
         COALESCE(SUM(CASE WHEN wr.status = 'PROCESSING' THEN wr.amount ELSE 0 END), 0) AS processing_disbursements,
         COUNT(CASE WHEN wr.status = 'SUCCESS' THEN 1 END) AS successful_withdrawal_count
       FROM withdrawal_requests wr
       JOIN pickers p ON wr.picker_id = p.id
       WHERE ${disbursementDateFilter('wr', '$1', '$2')}
       ${pickerScopeFilter}`,
      params
    ),
    pool.query(
      `SELECT
         DATE(COALESCE(wr.completed_at, wr.created_at)) AS disbursement_date,
         COALESCE(SUM(wr.amount), 0) AS amount,
         COUNT(*) AS withdrawal_count
       FROM withdrawal_requests wr
       JOIN pickers p ON wr.picker_id = p.id
       WHERE wr.status = 'SUCCESS'
         AND ${disbursementDateFilter('wr', '$1', '$2')}
         ${pickerScopeFilter}
       GROUP BY DATE(COALESCE(wr.completed_at, wr.created_at))
       ORDER BY disbursement_date ASC`,
      params
    ),
  ]);

  const row = totalsResult.rows[0] || {};

  return {
    total_disbursed: int(row.total_disbursed),
    processing_disbursements: int(row.processing_disbursements),
    successful_withdrawal_count: int(row.successful_withdrawal_count),
    daily_disbursements: dailyResult.rows.map((item) => ({
      date: item.disbursement_date,
      amount: int(item.amount),
      withdrawal_count: int(item.withdrawal_count),
    })),
  };
};

export const getPickerLifetimeTotals = async (pickerId) => {
  await ensureWithdrawalTables(pool);

  const [earnedResult, disbursedResult, walletResult] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(${sqlOriginalEarningAmount('e')}), 0) AS total_earned
       FROM earnings e
       JOIN waste_logs wl ON e.waste_log_id = wl.id
       WHERE e.picker_id = $1 AND wl.verified_at IS NOT NULL`,
      [pickerId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(wr.amount), 0) AS total_withdrawn
       FROM withdrawal_requests wr
       WHERE wr.picker_id = $1 AND wr.status = 'SUCCESS'`,
      [pickerId]
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN e.status = 'AVAILABLE' THEN e.amount ELSE 0 END), 0) AS in_wallet,
         COALESCE(SUM(CASE WHEN e.status = 'PAYOUT_PROCESSING' THEN e.amount ELSE 0 END), 0) AS processing
       FROM earnings e
       WHERE e.picker_id = $1`,
      [pickerId]
    ),
  ]);

  return {
    total_earned: int(earnedResult.rows[0]?.total_earned),
    total_withdrawn: int(disbursedResult.rows[0]?.total_withdrawn),
    in_wallet: int(walletResult.rows[0]?.in_wallet),
    processing: int(walletResult.rows[0]?.processing),
  };
};

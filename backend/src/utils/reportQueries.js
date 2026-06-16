/**
 * Shared SQL fragments for waste log weight reporting.
 * estimated_kg = picker-submitted estimate at log time.
 * verified_kg = agent-confirmed weight after verification (never use estimated for verified totals).
 */

export const VERIFIED_LOG_STATUSES = "('VERIFIED', 'PAID')";

/** Sum verified_kg only for agent-verified waste logs */
export const sqlVerifiedKgSum = (alias = 'wl') =>
  `COALESCE(SUM(CASE WHEN ${alias}.status IN ${VERIFIED_LOG_STATUSES} THEN COALESCE(${alias}.verified_kg, 0) ELSE 0 END), 0)`;

/** Sum estimated_kg for all non-rejected logs in period */
export const sqlEstimatedKgSum = (alias = 'wl') =>
  `COALESCE(SUM(CASE WHEN ${alias}.status != 'REJECTED' THEN COALESCE(${alias}.estimated_kg, 0) ELSE 0 END), 0)`;

/** Sum estimated_kg for pending (unverified) logs */
export const sqlPendingEstimatedKgSum = (alias = 'wl') =>
  `COALESCE(SUM(CASE WHEN ${alias}.status = 'PENDING' THEN COALESCE(${alias}.estimated_kg, 0) ELSE 0 END), 0)`;

/** Count verified logs (includes paid) */
export const sqlVerifiedLogCount = (alias = 'wl') =>
  `COUNT(CASE WHEN ${alias}.status IN ${VERIFIED_LOG_STATUSES} THEN 1 END)`;

export const parseVerifiedKg = (row, field = 'verified_kg') =>
  parseFloat(row?.[field] ?? 0);

export const parseEstimatedKg = (row, field = 'estimated_kg') =>
  parseFloat(row?.[field] ?? 0);

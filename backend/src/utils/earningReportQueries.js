/** SQL helpers for verified earnings (locked at agent verify) vs disbursements (cash out). */

export const sqlOriginalEarningAmount = (alias = 'e') =>
  `COALESCE(${alias}.original_amount, ${alias}.amount)`;

export const sqlVerifiedEarningsSum = (earningAlias = 'e', wasteLogAlias = 'wl') =>
  `COALESCE(SUM(CASE WHEN ${wasteLogAlias}.verified_at IS NOT NULL THEN ${sqlOriginalEarningAmount(earningAlias)} ELSE 0 END), 0)`;

export const sqlWithdrawnForWasteLog = (wasteLogAlias = 'wl') => `
  COALESCE((
    SELECT SUM(wre.amount)
    FROM withdrawal_request_earnings wre
    JOIN withdrawal_requests wr ON wr.id = wre.withdrawal_request_id
    WHERE wre.waste_log_id = ${wasteLogAlias}.id
      AND wr.status = 'SUCCESS'
  ), 0)`;

export const verifiedEarningsDateFilter = (wasteLogAlias = 'wl', startParam = '$1', endParam = '$2') =>
  `DATE(${wasteLogAlias}.verified_at) >= ${startParam} AND DATE(${wasteLogAlias}.verified_at) <= ${endParam}`;

export const disbursementDateFilter = (withdrawalAlias = 'wr', startParam = '$1', endParam = '$2') =>
  `DATE(COALESCE(${withdrawalAlias}.completed_at, ${withdrawalAlias}.created_at)) >= ${startParam}
   AND DATE(COALESCE(${withdrawalAlias}.completed_at, ${withdrawalAlias}.created_at)) <= ${endParam}`;

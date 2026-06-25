import pool from '../../config/db.js';
import {
  MOBILE_PROVIDERS,
  detectMobileProvider,
  isValidUgandaMobile,
  normalizeUgandaPhone,
  providerMatchesPhone,
} from '../../utils/mobileMoney.js';
import {
  recordPaymentStatusChange,
  transitionEarningPayment,
} from './earningPaymentService.js';
import { sqlOriginalEarningAmount } from '../../utils/earningReportQueries.js';
import { upsertPayoutTransaction } from './paymentService.js';
import { PAYMENT_STATUS, normalizePaymentStatus } from '../../utils/paymentStatus.js';

export const ensureWithdrawalTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id SERIAL PRIMARY KEY,
      picker_id INT NOT NULL REFERENCES pickers(id),
      provider VARCHAR(20) NOT NULL CHECK (provider IN ('MTN','AIRTEL','DEMO')),
      phone VARCHAR(30) NOT NULL,
      amount INT NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'UGX',
      status VARCHAR(20) NOT NULL CHECK (status IN ('PROCESSING','SUCCESS','FAILED','CANCELLED')),
      payment_reference VARCHAR(120),
      is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
      failure_reason TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_request_earnings (
      id SERIAL PRIMARY KEY,
      withdrawal_request_id INT NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
      earning_id INT NOT NULL REFERENCES earnings(id),
      waste_log_id INT NOT NULL REFERENCES waste_logs(id),
      amount INT NOT NULL,
      UNIQUE(withdrawal_request_id, earning_id)
    )
  `);
};

export const getEligibleEarningsForWithdrawal = async (client, pickerId, { forUpdate = false } = {}) => {
  await ensureWithdrawalTables(client);
  const lock = forUpdate ? 'FOR UPDATE OF e' : '';

  const result = await client.query(
    `SELECT
      e.id,
      e.picker_id,
      e.waste_log_id,
      e.amount,
      e.status,
      wl.job_code,
      wl.status AS waste_log_status
    FROM earnings e
    JOIN waste_logs wl ON e.waste_log_id = wl.id
    WHERE e.picker_id = $1
      AND e.status = $2
      AND e.amount > 0
    ORDER BY e.created_at ASC
    ${lock}`,
    [pickerId, PAYMENT_STATUS.AVAILABLE]
  );

  return result.rows;
};

export const getWithdrawalBalance = async (pickerId) => {
  const client = await pool.connect();
  try {
    await ensureWithdrawalTables(client);

    const summary = await client.query(
      `SELECT
        COALESCE(SUM(CASE WHEN e.status = 'AVAILABLE' THEN e.amount ELSE 0 END), 0) AS available_balance,
        COALESCE(SUM(CASE WHEN e.status = 'PAYOUT_PROCESSING' THEN e.amount ELSE 0 END), 0) AS payout_processing_balance,
        COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN e.status = 'FAILED' THEN e.amount ELSE 0 END), 0) AS failed_balance,
        COALESCE(SUM(${sqlOriginalEarningAmount('e')}), 0) AS total_earned,
        COUNT(CASE WHEN e.status = 'AVAILABLE' THEN 1 END) AS available_jobs
      FROM earnings e
      JOIN waste_logs wl ON e.waste_log_id = wl.id
      WHERE e.picker_id = $1 AND wl.verified_at IS NOT NULL`,
      [pickerId]
    );

    const pendingLogs = await client.query(
      `SELECT COUNT(*) AS pending_logs_count
       FROM waste_logs
       WHERE picker_id = $1 AND status = 'PENDING'`,
      [pickerId]
    );

    const pendingEstimate = await client.query(
      `SELECT COALESCE(SUM(
         CASE
           WHEN cwt.is_payable THEN ROUND(cwt.price_per_kg * wl.estimated_kg)
           ELSE 0
         END
       ), 0) AS pending_estimated_total
       FROM waste_logs wl
       LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
       WHERE wl.picker_id = $1 AND wl.status = 'PENDING'`,
      [pickerId]
    );

    const row = summary.rows[0];
    const availableBalance = parseInt(row.available_balance, 10);
    const totalEarned = parseInt(row.total_earned, 10);

    const withdrawnResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_withdrawn
       FROM withdrawal_requests
       WHERE picker_id = $1 AND status = 'SUCCESS'`,
      [pickerId]
    );
    const totalWithdrawn = parseInt(withdrawnResult.rows[0]?.total_withdrawn, 10);

    return {
      available_balance: availableBalance,
      available_to_withdraw: availableBalance,
      in_wallet: availableBalance,
      payout_processing_balance: parseInt(row.payout_processing_balance, 10),
      total_paid: totalWithdrawn,
      total_withdrawn: totalWithdrawn,
      total_earned: totalEarned,
      failed_balance: parseInt(row.failed_balance, 10),
      pending_logs_count: parseInt(pendingLogs.rows[0].pending_logs_count, 10),
      pending_estimated_total: parseInt(pendingEstimate.rows[0].pending_estimated_total, 10),
      available_jobs: parseInt(row.available_jobs, 10),
      currency: 'UGX',
    };
  } finally {
    client.release();
  }
};

export const allocateEarningsForAmount = (eligible, requestedAmount) => {
  const target = parseInt(requestedAmount, 10);
  let remaining = target;
  const allocations = [];

  for (const earning of eligible) {
    if (remaining <= 0) break;

    const earningAmount = parseInt(earning.amount, 10);
    const withdrawAmount = Math.min(earningAmount, remaining);

    allocations.push({
      ...earning,
      withdraw_amount: withdrawAmount,
      is_partial: withdrawAmount < earningAmount,
    });

    remaining -= withdrawAmount;
  }

  if (remaining > 0) return null;
  return allocations;
};

const reserveEarningForWithdrawal = async (
  client,
  { allocation, withdrawalId, changedBy, provider, phone, paymentReference }
) => {
  const withdrawAmount = parseInt(allocation.withdraw_amount, 10);
  const fullAmount = parseInt(allocation.amount, 10);
  const isPartial = allocation.is_partial;

  if (isPartial) {
    await client.query(`UPDATE earnings SET amount = $1 WHERE id = $2`, [
      fullAmount - withdrawAmount,
      allocation.id,
    ]);

    await recordPaymentStatusChange(client, {
      earningId: allocation.id,
      wasteLogId: allocation.waste_log_id,
      fromStatus: PAYMENT_STATUS.AVAILABLE,
      toStatus: PAYMENT_STATUS.AVAILABLE,
      amount: withdrawAmount,
      changedBy,
      paymentReference,
      notes: `Partial withdrawal reserve — ${fullAmount - withdrawAmount} UGX remains available`,
      isSimulated: true,
    });

    await client.query(
      `INSERT INTO withdrawal_request_earnings (withdrawal_request_id, earning_id, waste_log_id, amount)
       VALUES ($1, $2, $3, $4)`,
      [withdrawalId, allocation.id, allocation.waste_log_id, withdrawAmount]
    );

    try {
      await upsertPayoutTransaction(client, {
        earningId: allocation.id,
        wasteLogId: allocation.waste_log_id,
        pickerId: allocation.picker_id,
        provider: `${provider}_DEMO`,
        phone,
        amount: withdrawAmount,
        providerTransactionId: `${paymentReference}-PARTIAL-E${allocation.id}`,
        status: 'PROCESSING',
        paidAt: null,
      });
    } catch (payoutError) {
      if (payoutError?.code !== '42P01') throw payoutError;
    }

    return;
  }

  await transitionEarningPayment(client, {
    earningId: allocation.id,
    wasteLogId: allocation.waste_log_id,
    pickerId: allocation.picker_id,
    toStatus: PAYMENT_STATUS.PAYOUT_PROCESSING,
    changedBy,
    phone,
    paymentReference,
    simulate: true,
    notes: `Withdrawal #${withdrawalId} initiated via ${provider}`,
  });

  await client.query(
    `INSERT INTO withdrawal_request_earnings (withdrawal_request_id, earning_id, waste_log_id, amount)
     VALUES ($1, $2, $3, $4)`,
    [withdrawalId, allocation.id, allocation.waste_log_id, withdrawAmount]
  );
};

export const createPickerWithdrawal = async ({
  pickerId,
  provider,
  phone,
  amount = null,
  changedBy = null,
}) => {
  const normalizedProvider = String(provider || 'DEMO').toUpperCase();
  if (![MOBILE_PROVIDERS.MTN, MOBILE_PROVIDERS.AIRTEL, 'DEMO'].includes(normalizedProvider)) {
    const error = new Error('Provider must be MTN or AIRTEL');
    error.status = 400;
    throw error;
  }

  const normalizedPhone = normalizeUgandaPhone(phone);
  if (!isValidUgandaMobile(normalizedPhone)) {
    const error = new Error('Enter a valid Uganda mobile number (e.g. 0779305759)');
    error.status = 400;
    throw error;
  }

  if (
    normalizedProvider !== 'DEMO' &&
    !providerMatchesPhone(normalizedProvider, normalizedPhone)
  ) {
    const detected = detectMobileProvider(normalizedPhone);
    const error = new Error(
      detected
        ? `This number looks like ${detected}. Please select ${detected} or use a matching number.`
        : 'Phone number does not match the selected mobile money provider'
    );
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureWithdrawalTables(client);

    const eligible = await getEligibleEarningsForWithdrawal(client, pickerId, { forUpdate: true });

    if (eligible.length === 0) {
      const error = new Error(
        'No withdrawable balance. Wait for agent verification before withdrawing.'
      );
      error.status = 400;
      throw error;
    }

    const maxAvailable = eligible.reduce((sum, row) => sum + parseInt(row.amount, 10), 0);
    const requestedAmount =
      amount === null || amount === undefined || amount === ''
        ? maxAvailable
        : parseInt(amount, 10);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      const error = new Error('Enter a valid withdrawal amount greater than 0');
      error.status = 400;
      throw error;
    }

    if (requestedAmount > maxAvailable) {
      const error = new Error(`Amount exceeds available balance of ${maxAvailable} UGX`);
      error.status = 400;
      throw error;
    }

    const allocations = allocateEarningsForAmount(eligible, requestedAmount);
    if (!allocations?.length) {
      const error = new Error('Unable to allocate that amount from your earnings. Try a lower amount.');
      error.status = 400;
      throw error;
    }

    const totalAmount = allocations.reduce((sum, row) => sum + row.withdraw_amount, 0);
    const paymentReference = `WD-${pickerId}-${Date.now()}`;

    const withdrawalInsert = await client.query(
      `INSERT INTO withdrawal_requests (
        picker_id, provider, phone, amount, currency, status, payment_reference, is_simulated, notes
      ) VALUES ($1, $2, $3, $4, 'UGX', 'PROCESSING', $5, TRUE, $6)
      RETURNING *`,
      [
        pickerId,
        normalizedProvider,
        normalizedPhone,
        totalAmount,
        paymentReference,
        `Mobile money withdrawal pending provider confirmation (demo)`,
      ]
    );

    const withdrawal = withdrawalInsert.rows[0];

    for (const allocation of allocations) {
      await reserveEarningForWithdrawal(client, {
        allocation,
        withdrawalId: withdrawal.id,
        changedBy,
        provider: normalizedProvider,
        phone: normalizedPhone,
        paymentReference,
      });
    }

    await client.query('COMMIT');

    const items = await pool.query(
      `SELECT wre.earning_id, wre.waste_log_id, wre.amount, wl.job_code
       FROM withdrawal_request_earnings wre
       JOIN waste_logs wl ON wre.waste_log_id = wl.id
       WHERE wre.withdrawal_request_id = $1`,
      [withdrawal.id]
    );

    return {
      withdrawal,
      items: items.rows,
      total_amount: totalAmount,
      jobs_count: allocations.length,
      demo_notice:
        'Withdrawal submitted. Funds are processing — admin or provider will confirm payment.',
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const loadWithdrawalWithItems = async (client, withdrawalId, { forUpdate = false } = {}) => {
  await ensureWithdrawalTables(client);
  const lock = forUpdate ? 'FOR UPDATE' : '';

  const withdrawalResult = await client.query(
    `SELECT wr.*, p.name AS picker_name, p.phone AS picker_phone
     FROM withdrawal_requests wr
     JOIN pickers p ON wr.picker_id = p.id
     WHERE wr.id = $1
     ${lock}`,
    [withdrawalId]
  );

  if (withdrawalResult.rows.length === 0) return null;

  const items = await client.query(
    `SELECT wre.*, e.status AS earning_status, e.amount AS earning_amount, wl.job_code
     FROM withdrawal_request_earnings wre
     JOIN earnings e ON e.id = wre.earning_id
     JOIN waste_logs wl ON wl.id = wre.waste_log_id
     WHERE wre.withdrawal_request_id = $1`,
    [withdrawalId]
  );

  return {
    withdrawal: withdrawalResult.rows[0],
    items: items.rows,
  };
};

const finalizeWithdrawalItemPaid = async (
  client,
  { item, withdrawal, changedBy, paymentReference, simulate = true }
) => {
  const earningStatus = normalizePaymentStatus(item.earning_status);
  const payoutAmount = parseInt(item.amount, 10);

  if (earningStatus === PAYMENT_STATUS.PAYOUT_PROCESSING) {
    await transitionEarningPayment(client, {
      earningId: item.earning_id,
      wasteLogId: item.waste_log_id,
      pickerId: withdrawal.picker_id,
      toStatus: PAYMENT_STATUS.PAID,
      changedBy,
      phone: withdrawal.phone,
      paymentReference: `${paymentReference}-E${item.earning_id}`,
      simulate,
      notes: `Withdrawal #${withdrawal.id} confirmed`,
      transitionAmount: payoutAmount,
    });
    return;
  }

  if (earningStatus === PAYMENT_STATUS.AVAILABLE) {
    await recordPaymentStatusChange(client, {
      earningId: item.earning_id,
      wasteLogId: item.waste_log_id,
      fromStatus: PAYMENT_STATUS.AVAILABLE,
      toStatus: PAYMENT_STATUS.PAID,
      amount: payoutAmount,
      changedBy,
      paymentReference,
      notes: `Partial withdrawal #${withdrawal.id} confirmed`,
      isSimulated: simulate,
    });

    try {
      await upsertPayoutTransaction(client, {
        earningId: item.earning_id,
        wasteLogId: item.waste_log_id,
        pickerId: withdrawal.picker_id,
        provider: `${withdrawal.provider}_DEMO`,
        phone: withdrawal.phone,
        amount: payoutAmount,
        providerTransactionId: `${paymentReference}-E${item.earning_id}`,
        status: 'SUCCESS',
        paidAt: new Date(),
      });
    } catch (payoutError) {
      if (payoutError?.code !== '42P01') throw payoutError;
    }

    const earningRow = await client.query('SELECT amount FROM earnings WHERE id = $1', [item.earning_id]);
    const remaining = parseInt(earningRow.rows[0]?.amount || 0, 10);
    if (remaining <= 0) {
      await client.query(
        `UPDATE earnings SET status = $1, paid_at = NOW() WHERE id = $2`,
        [PAYMENT_STATUS.PAID, item.earning_id]
      );
      await client.query(
        `UPDATE waste_logs SET status = 'PAID', updated_at = NOW() WHERE id = $1 AND status = 'VERIFIED'`,
        [item.waste_log_id]
      );
    }
  }
};

const restoreWithdrawalItem = async (client, { item, withdrawal, changedBy, reason, toStatus }) => {
  const earningStatus = normalizePaymentStatus(item.earning_status);
  const payoutAmount = parseInt(item.amount, 10);

  if (earningStatus === PAYMENT_STATUS.PAYOUT_PROCESSING) {
    await transitionEarningPayment(client, {
      earningId: item.earning_id,
      wasteLogId: item.waste_log_id,
      pickerId: withdrawal.picker_id,
      toStatus,
      changedBy,
      notes: reason,
      transitionAmount: payoutAmount,
    });
    return;
  }

  if (earningStatus === PAYMENT_STATUS.AVAILABLE && toStatus === PAYMENT_STATUS.AVAILABLE) {
    await client.query(`UPDATE earnings SET amount = amount + $1 WHERE id = $2`, [
      payoutAmount,
      item.earning_id,
    ]);
    await recordPaymentStatusChange(client, {
      earningId: item.earning_id,
      wasteLogId: item.waste_log_id,
      fromStatus: PAYMENT_STATUS.AVAILABLE,
      toStatus: PAYMENT_STATUS.AVAILABLE,
      amount: payoutAmount,
      changedBy,
      notes: reason,
      isSimulated: true,
    });
  }
};

export const confirmWithdrawal = async (withdrawalId, { changedBy = null, notes = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loaded = await loadWithdrawalWithItems(client, withdrawalId, { forUpdate: true });
    if (!loaded) {
      const error = new Error('Withdrawal not found');
      error.status = 404;
      throw error;
    }

    const { withdrawal, items } = loaded;
    if (withdrawal.status !== 'PROCESSING') {
      const error = new Error(`Cannot confirm withdrawal in status ${withdrawal.status}`);
      error.status = 400;
      throw error;
    }

    const paymentReference = withdrawal.payment_reference || `WD-CONFIRM-${withdrawalId}`;

    for (const item of items) {
      await finalizeWithdrawalItemPaid(client, {
        item,
        withdrawal,
        changedBy,
        paymentReference,
        simulate: true,
      });
    }

    const updated = await client.query(
      `UPDATE withdrawal_requests
       SET status = 'SUCCESS', completed_at = NOW(), notes = COALESCE($2, notes)
       WHERE id = $1
       RETURNING *`,
      [withdrawalId, notes]
    );

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const failWithdrawal = async (withdrawalId, { changedBy = null, reason = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loaded = await loadWithdrawalWithItems(client, withdrawalId, { forUpdate: true });
    if (!loaded) {
      const error = new Error('Withdrawal not found');
      error.status = 404;
      throw error;
    }

    const { withdrawal, items } = loaded;
    if (withdrawal.status !== 'PROCESSING') {
      const error = new Error(`Cannot fail withdrawal in status ${withdrawal.status}`);
      error.status = 400;
      throw error;
    }

    for (const item of items) {
      await restoreWithdrawalItem(client, {
        item,
        withdrawal,
        changedBy,
        reason: reason || 'Provider payout failed',
        toStatus: PAYMENT_STATUS.FAILED,
      });
    }

    const updated = await client.query(
      `UPDATE withdrawal_requests
       SET status = 'FAILED', failure_reason = $2, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [withdrawalId, reason || 'Simulated provider failure']
    );

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const retryFailedWithdrawal = async (withdrawalId, { changedBy = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loaded = await loadWithdrawalWithItems(client, withdrawalId, { forUpdate: true });
    if (!loaded) {
      const error = new Error('Withdrawal not found');
      error.status = 404;
      throw error;
    }

    const { withdrawal, items } = loaded;
    if (withdrawal.status !== 'FAILED') {
      const error = new Error('Only failed withdrawals can be retried');
      error.status = 400;
      throw error;
    }

    for (const item of items) {
      const earningStatus = normalizePaymentStatus(item.earning_status);
      if (earningStatus === PAYMENT_STATUS.FAILED) {
        await transitionEarningPayment(client, {
          earningId: item.earning_id,
          wasteLogId: item.waste_log_id,
          pickerId: withdrawal.picker_id,
          toStatus: PAYMENT_STATUS.PAYOUT_PROCESSING,
          changedBy,
          phone: withdrawal.phone,
          paymentReference: `${withdrawal.payment_reference}-RETRY`,
          simulate: true,
          notes: `Withdrawal #${withdrawalId} retry`,
          transitionAmount: parseInt(item.amount, 10),
        });
      }
    }

    const updated = await client.query(
      `UPDATE withdrawal_requests
       SET status = 'PROCESSING', failure_reason = NULL, completed_at = NULL
       WHERE id = $1
       RETURNING *`,
      [withdrawalId]
    );

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const returnFailedWithdrawalToBalance = async (withdrawalId, { changedBy = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loaded = await loadWithdrawalWithItems(client, withdrawalId, { forUpdate: true });
    if (!loaded) {
      const error = new Error('Withdrawal not found');
      error.status = 404;
      throw error;
    }

    const { withdrawal, items } = loaded;
    if (withdrawal.status !== 'FAILED') {
      const error = new Error('Only failed withdrawals can be returned to balance');
      error.status = 400;
      throw error;
    }

    for (const item of items) {
      await restoreWithdrawalItem(client, {
        item,
        withdrawal,
        changedBy,
        reason: 'Returned to withdrawable balance after failed payout',
        toStatus: PAYMENT_STATUS.AVAILABLE,
      });
    }

    const updated = await client.query(
      `UPDATE withdrawal_requests
       SET status = 'CANCELLED', notes = COALESCE(notes, '') || ' Returned to picker balance.'
       WHERE id = $1
       RETURNING *`,
      [withdrawalId]
    );

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const listWithdrawals = async ({ pickerId = null, limit = 20 } = {}) => {
  await ensureWithdrawalTables(pool);

  const params = [];
  let where = 'WHERE 1=1';

  if (pickerId) {
    params.push(pickerId);
    where += ` AND wr.picker_id = $${params.length}`;
  }

  params.push(limit);

  const result = await pool.query(
    `SELECT
      wr.id,
      wr.picker_id,
      p.name AS picker_name,
      p.phone AS picker_phone,
      wr.provider,
      wr.phone,
      wr.amount,
      wr.currency,
      wr.status,
      wr.payment_reference,
      wr.is_simulated,
      wr.failure_reason,
      wr.notes,
      wr.created_at,
      wr.completed_at,
      COUNT(wre.id) AS jobs_count
    FROM withdrawal_requests wr
    JOIN pickers p ON wr.picker_id = p.id
    LEFT JOIN withdrawal_request_earnings wre ON wr.id = wre.withdrawal_request_id
    ${where}
    GROUP BY wr.id, p.name, p.phone
    ORDER BY wr.created_at DESC
    LIMIT $${params.length}`,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    picker_id: row.picker_id,
    picker_name: row.picker_name,
    picker_phone: row.picker_phone,
    provider: row.provider,
    phone: row.phone,
    amount: parseInt(row.amount, 10),
    currency: row.currency,
    status: row.status,
    payment_reference: row.payment_reference,
    is_simulated: row.is_simulated,
    failure_reason: row.failure_reason,
    notes: row.notes,
    created_at: row.created_at,
    completed_at: row.completed_at,
    jobs_count: parseInt(row.jobs_count, 10),
  }));
};

export const getWithdrawalById = async (withdrawalId, pickerId = null) => {
  const params = [withdrawalId];
  let filter = 'WHERE wr.id = $1';

  if (pickerId) {
    params.push(pickerId);
    filter += ` AND wr.picker_id = $2`;
  }

  const result = await pool.query(
    `SELECT
      wr.*,
      p.name AS picker_name,
      p.phone AS picker_phone
    FROM withdrawal_requests wr
    JOIN pickers p ON wr.picker_id = p.id
    ${filter}
    LIMIT 1`,
    params
  );

  if (result.rows.length === 0) return null;

  const withdrawal = result.rows[0];
  const items = await pool.query(
    `SELECT wre.earning_id, wre.waste_log_id, wre.amount, wl.job_code, e.status AS earning_status
     FROM withdrawal_request_earnings wre
     JOIN waste_logs wl ON wre.waste_log_id = wl.id
     JOIN earnings e ON e.id = wre.earning_id
     WHERE wre.withdrawal_request_id = $1`,
    [withdrawalId]
  );

  return {
    ...withdrawal,
    amount: parseInt(withdrawal.amount, 10),
    items: items.rows,
  };
};

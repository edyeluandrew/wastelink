import pool from '../../config/db.js';
import {
  MOBILE_PROVIDERS,
  detectMobileProvider,
  isSimulationWithdrawalMode,
  isValidUgandaMobile,
  normalizeUgandaPhone,
  providerMatchesPhone,
} from '../../utils/mobileMoney.js';
import {
  simulateMobileMoneyWithdrawal,
} from './mobileMoneyWithdrawalService.js';
import {
  recordPaymentStatusChange,
} from './earningPaymentService.js';
import { upsertPayoutTransaction } from './paymentService.js';
import { PAYMENT_STATUS } from '../../utils/paymentStatus.js';

export const ensureWithdrawalTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id SERIAL PRIMARY KEY,
      picker_id INT NOT NULL REFERENCES pickers(id),
      provider VARCHAR(20) NOT NULL CHECK (provider IN ('MTN','AIRTEL')),
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
  const simulation = isSimulationWithdrawalMode();

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
      AND (
        e.status = $2
        OR ($3 = true AND e.status = 'PENDING' AND wl.status IN ('VERIFIED', 'PAID'))
      )
    ORDER BY e.created_at ASC
    ${lock}`,
    [pickerId, PAYMENT_STATUS.APPROVED, simulation]
  );

  return result.rows;
};

export const getWithdrawalBalance = async (pickerId) => {
  const client = await pool.connect();
  try {
    await ensureWithdrawalTables(client);

    const summary = await client.query(
      `SELECT
        COALESCE(SUM(CASE WHEN e.status = 'APPROVED' THEN e.amount ELSE 0 END), 0) AS approved_amount,
        COALESCE(SUM(CASE WHEN e.status = 'PENDING' AND wl.status IN ('VERIFIED','PAID') THEN e.amount ELSE 0 END), 0) AS pending_approval_amount,
        COALESCE(SUM(CASE WHEN e.status = 'PAYOUT_INITIATED' THEN e.amount ELSE 0 END), 0) AS processing_amount,
        COALESCE(SUM(CASE WHEN e.status = 'PAID' THEN e.amount ELSE 0 END), 0) AS paid_amount,
        COUNT(CASE WHEN e.status = 'APPROVED' THEN 1 END) AS approved_jobs,
        COUNT(CASE WHEN e.status = 'PENDING' AND wl.status IN ('VERIFIED','PAID') THEN 1 END) AS pending_approval_jobs
      FROM earnings e
      JOIN waste_logs wl ON e.waste_log_id = wl.id
      WHERE e.picker_id = $1`,
      [pickerId]
    );

    const simulation = isSimulationWithdrawalMode();
    const row = summary.rows[0];
    const approvedAmount = parseInt(row.approved_amount, 10);
    const pendingApprovalAmount = parseInt(row.pending_approval_amount, 10);

    return {
      available_to_withdraw: simulation
        ? approvedAmount + pendingApprovalAmount
        : approvedAmount,
      approved_amount: approvedAmount,
      pending_approval_amount: pendingApprovalAmount,
      processing_amount: parseInt(row.processing_amount, 10),
      paid_amount: parseInt(row.paid_amount, 10),
      approved_jobs: parseInt(row.approved_jobs, 10),
      pending_approval_jobs: parseInt(row.pending_approval_jobs, 10),
      simulation_mode: simulation,
      currency: 'UGX',
    };
  } finally {
    client.release();
  }
};

const markEarningPaidForWithdrawal = async (
  client,
  { earning, pickerId, provider, phone, paymentReference, changedBy, isSimulated }
) => {
  let currentStatus = earning.status;

  if (currentStatus === PAYMENT_STATUS.PENDING) {
    await client.query(`UPDATE earnings SET status = $1 WHERE id = $2`, [
      PAYMENT_STATUS.APPROVED,
      earning.id,
    ]);
    await recordPaymentStatusChange(client, {
      earningId: earning.id,
      wasteLogId: earning.waste_log_id,
      fromStatus: PAYMENT_STATUS.PENDING,
      toStatus: PAYMENT_STATUS.APPROVED,
      amount: earning.amount,
      changedBy,
      notes: 'Auto-approved for demo mobile money withdrawal',
      isSimulated: true,
    });
    currentStatus = PAYMENT_STATUS.APPROVED;
  }

  if (currentStatus === PAYMENT_STATUS.APPROVED) {
    await client.query(`UPDATE earnings SET status = $1 WHERE id = $2`, [
      PAYMENT_STATUS.PAYOUT_INITIATED,
      earning.id,
    ]);
    await recordPaymentStatusChange(client, {
      earningId: earning.id,
      wasteLogId: earning.waste_log_id,
      fromStatus: PAYMENT_STATUS.APPROVED,
      toStatus: PAYMENT_STATUS.PAYOUT_INITIATED,
      amount: earning.amount,
      changedBy,
      paymentReference,
      notes: `Mobile money withdrawal initiated via ${provider}`,
      isSimulated: isSimulated,
    });
    currentStatus = PAYMENT_STATUS.PAYOUT_INITIATED;
  }

  const paidAt = new Date();
  await client.query(`UPDATE earnings SET status = $1, paid_at = $2 WHERE id = $3`, [
    PAYMENT_STATUS.PAID,
    paidAt,
    earning.id,
  ]);

  await client.query(
    `UPDATE waste_logs SET status = 'PAID', updated_at = NOW()
     WHERE id = $1 AND status IN ('VERIFIED', 'PAID')`,
    [earning.waste_log_id]
  );

  await recordPaymentStatusChange(client, {
    earningId: earning.id,
    wasteLogId: earning.waste_log_id,
    fromStatus: currentStatus,
    toStatus: PAYMENT_STATUS.PAID,
    amount: earning.amount,
    changedBy,
    paymentReference,
    notes: `Demo ${provider} mobile money withdrawal completed`,
    isSimulated: isSimulated,
  });

  try {
    await upsertPayoutTransaction(client, {
      earningId: earning.id,
      wasteLogId: earning.waste_log_id,
      pickerId,
      provider: `${provider}_SIM`,
      phone,
      amount: earning.amount,
      providerTransactionId: paymentReference,
      status: 'SUCCESS',
      paidAt,
    });
  } catch (payoutError) {
    if (payoutError?.code !== '42P01') throw payoutError;
  }
};

export const createPickerWithdrawal = async ({
  pickerId,
  provider,
  phone,
  changedBy = null,
}) => {
  const normalizedProvider = String(provider || '').toUpperCase();
  if (![MOBILE_PROVIDERS.MTN, MOBILE_PROVIDERS.AIRTEL].includes(normalizedProvider)) {
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

  if (!providerMatchesPhone(normalizedProvider, normalizedPhone)) {
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
        isSimulationWithdrawalMode()
          ? 'No earnings available to withdraw. Wait for agent verification first.'
          : 'No approved earnings available. Admin must approve your earnings before withdrawal.'
      );
      error.status = 400;
      throw error;
    }

    const totalAmount = eligible.reduce((sum, row) => sum + parseInt(row.amount, 10), 0);

    const withdrawalInsert = await client.query(
      `INSERT INTO withdrawal_requests (
        picker_id, provider, phone, amount, currency, status, is_simulated, notes
      ) VALUES ($1, $2, $3, $4, 'UGX', 'PROCESSING', TRUE, $5)
      RETURNING *`,
      [
        pickerId,
        normalizedProvider,
        normalizedPhone,
        totalAmount,
        'Demo mobile money withdrawal — no real funds transferred',
      ]
    );

    const withdrawal = withdrawalInsert.rows[0];

    for (const earning of eligible) {
      await client.query(
        `INSERT INTO withdrawal_request_earnings (withdrawal_request_id, earning_id, waste_log_id, amount)
         VALUES ($1, $2, $3, $4)`,
        [withdrawal.id, earning.id, earning.waste_log_id, earning.amount]
      );
    }

    await client.query('COMMIT');
    client.release();
    client = null;

    const simulationResult = await simulateMobileMoneyWithdrawal({
      withdrawalId: withdrawal.id,
      pickerId,
      provider: normalizedProvider,
      phone: normalizedPhone,
      amount: totalAmount,
    });

    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');

      for (const earning of eligible) {
        await markEarningPaidForWithdrawal(tx, {
          earning,
          pickerId,
          provider: normalizedProvider,
          phone: normalizedPhone,
          paymentReference: `${simulationResult.provider_transaction_id}-E${earning.id}`,
          changedBy,
          isSimulated: true,
        });
      }

      const completed = await tx.query(
        `UPDATE withdrawal_requests
         SET status = 'SUCCESS',
             payment_reference = $1,
             completed_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [simulationResult.provider_transaction_id, withdrawal.id]
      );

      await tx.query('COMMIT');

      const items = await pool.query(
        `SELECT wre.earning_id, wre.waste_log_id, wre.amount, wl.job_code
         FROM withdrawal_request_earnings wre
         JOIN waste_logs wl ON wre.waste_log_id = wl.id
         WHERE wre.withdrawal_request_id = $1`,
        [withdrawal.id]
      );

      return {
        withdrawal: completed.rows[0],
        simulation: simulationResult,
        items: items.rows,
        total_amount: totalAmount,
        jobs_count: eligible.length,
      };
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (client) client.release();
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
    `SELECT wre.earning_id, wre.waste_log_id, wre.amount, wl.job_code
     FROM withdrawal_request_earnings wre
     JOIN waste_logs wl ON wre.waste_log_id = wl.id
     WHERE wre.withdrawal_request_id = $1`,
    [withdrawalId]
  );

  return {
    ...withdrawal,
    amount: parseInt(withdrawal.amount, 10),
    items: items.rows,
  };
};

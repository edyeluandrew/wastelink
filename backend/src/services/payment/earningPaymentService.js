import {
  PAYMENT_STATUS,
  canTransitionPaymentStatus,
  normalizePaymentStatus,
} from '../../utils/paymentStatus.js';
import { recordManualPayoutTransaction, upsertPayoutTransaction } from './paymentService.js';
import { simulatePayment } from './simulationPaymentService.js';

const ensureHistoryTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_status_history (
      id SERIAL PRIMARY KEY,
      earning_id INT NOT NULL REFERENCES earnings(id),
      waste_log_id INT NOT NULL REFERENCES waste_logs(id),
      from_status VARCHAR(30),
      to_status VARCHAR(30) NOT NULL,
      payment_reference VARCHAR(120),
      amount INT,
      changed_by INT,
      notes TEXT,
      is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

export const recordPaymentStatusChange = async (
  client,
  {
    earningId,
    wasteLogId,
    fromStatus,
    toStatus,
    paymentReference = null,
    amount = null,
    changedBy = null,
    notes = null,
    isSimulated = false,
  }
) => {
  await ensureHistoryTable(client);

  await client.query(
    `INSERT INTO payment_status_history (
      earning_id, waste_log_id, from_status, to_status,
      payment_reference, amount, changed_by, notes, is_simulated
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      earningId,
      wasteLogId,
      fromStatus,
      toStatus,
      paymentReference,
      amount,
      changedBy,
      notes,
      isSimulated,
    ]
  );
};

export const getPaymentStatusHistory = async (client, earningId) => {
  await ensureHistoryTable(client);

  const result = await client.query(
    `SELECT id, earning_id, waste_log_id, from_status, to_status,
            payment_reference, amount, changed_by, notes, is_simulated, created_at
     FROM payment_status_history
     WHERE earning_id = $1
     ORDER BY created_at ASC`,
    [earningId]
  );

  return result.rows;
};

export const transitionEarningPayment = async (
  client,
  {
    earningId,
    wasteLogId,
    pickerId,
    toStatus,
    changedBy = null,
    notes = null,
    paymentReference = null,
    phone = null,
    simulate = false,
    transitionAmount = null,
  }
) => {
  const earningResult = await client.query(
    'SELECT id, status, amount, picker_id, waste_log_id FROM earnings WHERE id = $1 FOR UPDATE',
    [earningId]
  );

  if (earningResult.rows.length === 0) {
    const error = new Error('Earning not found');
    error.status = 404;
    throw error;
  }

  const earning = earningResult.rows[0];
  const fromStatus = normalizePaymentStatus(earning.status);
  const targetStatus = normalizePaymentStatus(toStatus);

  if (!canTransitionPaymentStatus(fromStatus, targetStatus)) {
    const error = new Error(
      `Cannot transition payment from ${fromStatus} to ${targetStatus}`
    );
    error.status = 400;
    throw error;
  }

  const updateFields = ['status = $1'];
  const params = [targetStatus];
  let paidAt = null;

  if (targetStatus === PAYMENT_STATUS.PAID) {
    paidAt = new Date();
    updateFields.push(`paid_at = $${params.length + 1}`);
    params.push(paidAt);
  }

  if (targetStatus === PAYMENT_STATUS.AVAILABLE) {
    updateFields.push('paid_at = NULL');
  }

  params.push(earningId);

  const updatedEarningResult = await client.query(
    `UPDATE earnings SET ${updateFields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  const updatedEarning = updatedEarningResult.rows[0];
  const amountForRecord = transitionAmount ?? earning.amount;
  let payoutTransaction = null;
  let resolvedReference = paymentReference;

  if (targetStatus === PAYMENT_STATUS.PAYOUT_PROCESSING) {
    resolvedReference =
      paymentReference || `PAYOUT-PROC-${earningId}-${Date.now()}`;

    try {
      payoutTransaction = await upsertPayoutTransaction(client, {
        earningId,
        wasteLogId: wasteLogId || earning.waste_log_id,
        pickerId: pickerId || earning.picker_id,
        provider: simulate ? 'DEMO' : 'MANUAL',
        phone,
        amount: amountForRecord,
        providerTransactionId: resolvedReference,
        status: 'PROCESSING',
        paidAt: null,
      });
    } catch (payoutError) {
      if (payoutError?.code !== '42P01') throw payoutError;
    }
  }

  if (targetStatus === PAYMENT_STATUS.PAID) {
    const simResult = simulate
      ? await simulatePayment({
          earningId,
          wasteLogId: wasteLogId || earning.waste_log_id,
          pickerId: pickerId || earning.picker_id,
          amount: amountForRecord,
          phone,
        })
      : null;

    resolvedReference =
      paymentReference ||
      simResult?.provider_transaction_id ||
      `PAID-${earningId}-${Date.now()}`;

    try {
      payoutTransaction = await upsertPayoutTransaction(client, {
        earningId,
        wasteLogId: wasteLogId || earning.waste_log_id,
        pickerId: pickerId || earning.picker_id,
        provider: simulate ? 'DEMO' : 'MANUAL',
        phone,
        amount: amountForRecord,
        providerTransactionId: resolvedReference,
        status: 'SUCCESS',
        paidAt: paidAt || new Date(),
      });
    } catch (payoutError) {
      if (payoutError?.code !== '42P01') throw payoutError;
    }

    await client.query(
      `UPDATE waste_logs SET status = 'PAID', updated_at = NOW() WHERE id = $1 AND status = 'VERIFIED'`,
      [wasteLogId || earning.waste_log_id]
    );
  }

  await recordPaymentStatusChange(client, {
    earningId,
    wasteLogId: wasteLogId || earning.waste_log_id,
    fromStatus,
    toStatus: targetStatus,
    paymentReference: resolvedReference,
    amount: amountForRecord,
    changedBy,
    notes,
    isSimulated: simulate,
  });

  return {
    earning: updatedEarning,
    payout_transaction: payoutTransaction,
    payment_reference: resolvedReference,
    from_status: fromStatus,
    to_status: targetStatus,
    is_simulated: simulate,
  };
};

export { recordManualPayoutTransaction };

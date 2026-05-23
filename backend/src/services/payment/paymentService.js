const DEFAULT_CURRENCY = 'UGX';

const buildProviderTransactionId = (prefix, id) => {
  return `${prefix}-${id}-${Date.now()}`;
};

export const upsertPayoutTransaction = async (
  client,
  {
    earningId,
    wasteLogId,
    pickerId,
    provider = 'MANUAL',
    phone = null,
    amount,
    currency = DEFAULT_CURRENCY,
    providerTransactionId = null,
    status = 'SUCCESS',
    failureReason = null,
    paidAt = new Date(),
  }
) => {
  const result = await client.query(
    `INSERT INTO payout_transactions (
      earning_id,
      waste_log_id,
      picker_id,
      provider,
      phone,
      amount,
      currency,
      provider_transaction_id,
      status,
      failure_reason,
      paid_at,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    ON CONFLICT (earning_id) DO UPDATE SET
      waste_log_id = EXCLUDED.waste_log_id,
      picker_id = EXCLUDED.picker_id,
      provider = EXCLUDED.provider,
      phone = EXCLUDED.phone,
      amount = EXCLUDED.amount,
      currency = EXCLUDED.currency,
      provider_transaction_id = EXCLUDED.provider_transaction_id,
      status = EXCLUDED.status,
      failure_reason = EXCLUDED.failure_reason,
      paid_at = EXCLUDED.paid_at,
      updated_at = NOW()
    RETURNING *`,
    [
      earningId,
      wasteLogId,
      pickerId,
      provider,
      phone,
      amount,
      currency,
      providerTransactionId,
      status,
      failureReason,
      paidAt,
    ]
  );

  return result.rows[0];
};

export const recordManualPayoutTransaction = async (client, payload) => {
  return upsertPayoutTransaction(client, {
    ...payload,
    provider: 'MANUAL',
    providerTransactionId: buildProviderTransactionId('MANUAL', payload.earningId),
    status: 'SUCCESS',
    paidAt: new Date(),
  });
};
export const simulatePayment = async ({ earningId, wasteLogId, pickerId, amount, phone, currency = 'UGX' }) => {
  return {
    success: true,
    provider: 'SIMULATION',
    provider_transaction_id: `SIM-${earningId}-${Date.now()}`,
    earning_id: earningId,
    waste_log_id: wasteLogId,
    picker_id: pickerId,
    phone: phone || null,
    amount,
    currency,
    status: 'SUCCESS',
    paid_at: new Date(),
  };
};
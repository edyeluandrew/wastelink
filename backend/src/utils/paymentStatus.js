/** Earning payout lifecycle statuses (Module 15) */
export const PAYMENT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  PAYOUT_PROCESSING: 'PAYOUT_PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
};

/** Legacy statuses — normalized away after migration */
export const LEGACY_PAYMENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAYOUT_INITIATED: 'PAYOUT_INITIATED',
};

export const normalizePaymentStatus = (status) => {
  const value = String(status || '').toUpperCase();
  switch (value) {
    case LEGACY_PAYMENT_STATUS.PENDING:
    case LEGACY_PAYMENT_STATUS.APPROVED:
      return PAYMENT_STATUS.AVAILABLE;
    case LEGACY_PAYMENT_STATUS.PAYOUT_INITIATED:
      return PAYMENT_STATUS.PAYOUT_PROCESSING;
    default:
      return value;
  }
};

export const PAYMENT_STATUS_TRANSITIONS = {
  [PAYMENT_STATUS.AVAILABLE]: [PAYMENT_STATUS.PAYOUT_PROCESSING, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAYOUT_PROCESSING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PAYOUT_PROCESSING, PAYMENT_STATUS.AVAILABLE],
};

export const canTransitionPaymentStatus = (fromStatus, toStatus) => {
  const from = normalizePaymentStatus(fromStatus);
  const to = normalizePaymentStatus(toStatus);
  const allowed = PAYMENT_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

export const isTerminalPaymentStatus = (status) => {
  const normalized = normalizePaymentStatus(status);
  return normalized === PAYMENT_STATUS.PAID;
};

/** SQL fragment for confirmed (verified) earnings totals */
export const SQL_CONFIRMED_EARNING_STATUSES = `('AVAILABLE','PAYOUT_PROCESSING','PAID')`;

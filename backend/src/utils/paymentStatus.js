/** Earning payout lifecycle statuses */
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAYOUT_INITIATED: 'PAYOUT_INITIATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
};

export const PAYMENT_STATUS_TRANSITIONS = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.APPROVED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.APPROVED]: [PAYMENT_STATUS.PAYOUT_INITIATED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAYOUT_INITIATED]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.APPROVED],
};

export const canTransitionPaymentStatus = (fromStatus, toStatus) => {
  const allowed = PAYMENT_STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

export const isTerminalPaymentStatus = (status) =>
  status === PAYMENT_STATUS.PAID || status === PAYMENT_STATUS.FAILED;

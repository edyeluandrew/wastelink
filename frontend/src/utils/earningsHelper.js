/**
 * Safe earnings accessor functions
 * Handle multiple possible field names from backend responses
 */

const LEGACY_STATUS_MAP = {
  PENDING: 'AVAILABLE',
  APPROVED: 'AVAILABLE',
  PAYOUT_INITIATED: 'PAYOUT_PROCESSING',
};

export const normalizeEarningStatus = (status) => {
  const value = String(status || '').toUpperCase();
  return LEGACY_STATUS_MAP[value] || value;
};

export const getEarningAmount = (log) => {
  if (!log) return 0;

  if (log.earning?.amount !== undefined && log.earning?.amount !== null) {
    return Number(log.earning.amount) || 0;
  }

  if (log.amount !== undefined && log.amount !== null) {
    return Number(log.amount) || 0;
  }

  return 0;
};

export const getEarningStatus = (log) => {
  if (!log) return 'NONE';

  if (log.earning?.status) {
    return normalizeEarningStatus(log.earning.status);
  }

  if (log.earning_status) {
    return normalizeEarningStatus(log.earning_status);
  }

  return 'NONE';
};

export const getRatePerKg = (log) => {
  if (!log) return 0;

  if (log.earning?.rate_per_kg !== undefined && log.earning?.rate_per_kg !== null) {
    return Number(log.earning.rate_per_kg) || 0;
  }

  if (log.rate_per_kg !== undefined && log.rate_per_kg !== null) {
    return Number(log.rate_per_kg) || 0;
  }

  return 0;
};

export const getPaidAt = (log) => {
  if (!log) return null;

  if (log.earning?.paid_at) {
    return log.earning.paid_at;
  }

  if (log.paid_at) {
    return log.paid_at;
  }

  return null;
};

export const isPaid = (log) => getEarningStatus(log) === 'PAID';

export const isEarningAvailable = (log) => getEarningStatus(log) === 'AVAILABLE';

export const hasEarning = (log) => getEarningAmount(log) > 0 || getEarningStatus(log) !== 'NONE';

export const getRemainingEarningAmount = (log) => {
  const status = getEarningStatus(log);
  if (status === 'PAID') return 0;
  if (!log || !['VERIFIED', 'PAID'].includes(String(log.status || '').toUpperCase())) return 0;
  if (['AVAILABLE', 'PAYOUT_PROCESSING', 'FAILED'].includes(status)) {
    return getEarningAmount(log);
  }
  return 0;
};

export const sumRemainingEarnings = (logs = []) =>
  logs.reduce((sum, log) => sum + getRemainingEarningAmount(log), 0);

export const sumSuccessfulWithdrawals = (withdrawals = []) =>
  withdrawals
    .filter((item) => String(item?.status || '').toUpperCase() === 'SUCCESS')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

export const sumProcessingWithdrawals = (withdrawals = []) =>
  withdrawals
    .filter((item) => String(item?.status || '').toUpperCase() === 'PROCESSING')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

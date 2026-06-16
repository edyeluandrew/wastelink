/**
 * Safe earnings accessor functions
 * Handle multiple possible field names from backend responses
 */

export const getEarningAmount = (log) => {
  if (!log) return 0;
  
  // Try nested object first
  if (log.earning?.amount !== undefined && log.earning?.amount !== null) {
    return Number(log.earning.amount) || 0;
  }
  
  // Try flat fields
  if (log.amount !== undefined && log.amount !== null) {
    return Number(log.amount) || 0;
  }
  
  return 0;
};

export const getEarningStatus = (log) => {
  if (!log) return 'NONE';
  
  // Try nested object first
  if (log.earning?.status) {
    return String(log.earning.status).toUpperCase();
  }
  
  // Try flat field
  if (log.earning_status) {
    return String(log.earning_status).toUpperCase();
  }
  
  return 'NONE';
};

export const getRatePerKg = (log) => {
  if (!log) return 0;
  
  // Try nested object first
  if (log.earning?.rate_per_kg !== undefined && log.earning?.rate_per_kg !== null) {
    return Number(log.earning.rate_per_kg) || 0;
  }
  
  // Try flat field
  if (log.rate_per_kg !== undefined && log.rate_per_kg !== null) {
    return Number(log.rate_per_kg) || 0;
  }
  
  return 0;
};

export const getPaidAt = (log) => {
  if (!log) return null;
  
  // Try nested object first
  if (log.earning?.paid_at) {
    return log.earning.paid_at;
  }
  
  // Try flat field
  if (log.paid_at) {
    return log.paid_at;
  }
  
  return null;
};

export const isPaid = (log) => {
  const status = getEarningStatus(log);
  return status === 'PAID';
};

export const isEarningPending = (log) => {
  const status = getEarningStatus(log);
  return status === 'PENDING';
};

export const hasEarning = (log) => {
  return getEarningAmount(log) > 0 || getEarningStatus(log) !== 'NONE';
};

export const getRemainingEarningAmount = (log) => {
  if (getEarningStatus(log) === 'PAID') return 0;
  if (!log || !['VERIFIED', 'PAID'].includes(String(log.status || '').toUpperCase())) return 0;
  return getEarningAmount(log);
};

export const sumRemainingEarnings = (logs = []) =>
  logs.reduce((sum, log) => sum + getRemainingEarningAmount(log), 0);

export const sumSuccessfulWithdrawals = (withdrawals = []) =>
  withdrawals
    .filter((item) => String(item?.status || '').toUpperCase() === 'SUCCESS')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

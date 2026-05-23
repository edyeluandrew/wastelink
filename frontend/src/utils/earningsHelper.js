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

export const getEarningId = (log) => {
  if (!log) return null;
  
  if (log.earning?.id !== undefined && log.earning?.id !== null) {
    return log.earning.id;
  }
  
  if (log.earning_id !== undefined && log.earning_id !== null) {
    return log.earning_id;
  }
  
  return null;
};

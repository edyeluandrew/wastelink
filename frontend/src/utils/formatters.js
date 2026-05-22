/**
 * Format currency as Ugandan Shillings
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrencyUGX = (amount) => {
  if (amount === null || amount === undefined) return '0 UGX';
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format weight in kilograms
 * @param {number} value
 * @returns {string}
 */
export const formatKg = (value) => {
  if (value === null || value === undefined) return '0 kg';
  return `${parseFloat(value).toFixed(2)} kg`;
};

/**
 * Format weight in tonnes
 * @param {number} value
 * @returns {string}
 */
export const formatTonnes = (value) => {
  if (value === null || value === undefined) return '0 t';
  return `${parseFloat(value).toFixed(3)} t`;
};

/**
 * Format percentage
 * @param {number} value
 * @returns {string}
 */
export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%';
  return `${Math.round(value)}%`;
};

/**
 * Format date as YYYY-MM-DD or relative time
 * @param {string|Date} value
 * @param {boolean} relative - show as relative time
 * @returns {string}
 */
export const formatDate = (value, relative = false) => {
  if (!value) return '-';
  const date = new Date(value);

  if (relative) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Format date-time
 * @param {string|Date} value
 * @returns {string}
 */
export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format number with thousands separator
 * @param {number} value
 * @returns {string}
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Format time only (HH:MM)
 * @param {string|Date} value
 * @returns {string}
 */
export const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format status badge text
 * @param {string} status
 * @returns {string}
 */
export const formatStatus = (status) => {
  if (!status) return '-';
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Alias for formatCurrencyUGX - format currency as Ugandan Shillings
 * @param {number} amount
 * @returns {string}
 */
export const formatUGX = formatCurrencyUGX;

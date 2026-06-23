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
 * Format gender for display while handling old/unknown values safely
 * @param {string} gender
 * @returns {string}
 */
export const formatGenderLabel = (gender) => {
  if (!gender) return 'Unknown';

  const normalized = String(gender).trim().toLowerCase();
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  if (normalized === 'prefer_not_to_say') return 'Unknown';

  return String(gender);
};

/**
 * Alias for formatCurrencyUGX - format currency as Ugandan Shillings
 * @param {number} amount
 * @returns {string}
 */
export const formatUGX = formatCurrencyUGX;

/**
 * Combine optional date (YYYY-MM-DD) and time (HH:MM) into an ISO string for API.
 * Returns undefined when no date is provided.
 * @param {string} dateStr
 * @param {string} [timeStr]
 * @returns {string|undefined}
 */
export const buildPickupIso = (dateStr, timeStr) => {
  if (!dateStr) return undefined;
  const time = timeStr || '09:00';
  const parsed = new Date(`${dateStr}T${time}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

/**
 * Split a pickup datetime into date and time strings for form inputs.
 * @param {string|Date|null|undefined} value
 * @returns {{ date: string, time: string }}
 */
export const splitPickupDateTime = (value) => {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
};

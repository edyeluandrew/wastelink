/** Uganda mobile money provider helpers (simulation) */

export const MOBILE_PROVIDERS = {
  MTN: 'MTN',
  AIRTEL: 'AIRTEL',
};

export const normalizeUgandaPhone = (phone) => {
  if (!phone) return null;
  let value = String(phone).trim().replace(/\s+/g, '').replace(/[^\d+]/g, '');

  if (value.startsWith('+256')) return value;
  if (value.startsWith('256')) return `+${value}`;
  if (value.startsWith('0')) return `+256${value.slice(1)}`;
  if (value.length === 9) return `+256${value}`;

  return value.startsWith('+') ? value : `+${value}`;
};

export const getPhonePrefix = (phone) => {
  const normalized = normalizeUgandaPhone(phone);
  if (!normalized?.startsWith('+256')) return null;
  return normalized.slice(4, 6);
};

/** MTN Uganda prefixes: 77, 78, 76, 39 */
const MTN_PREFIXES = new Set(['77', '78', '76', '39']);

/** Airtel Uganda prefixes: 70, 75, 74, 20 */
const AIRTEL_PREFIXES = new Set(['70', '75', '74', '20']);

export const detectMobileProvider = (phone) => {
  const prefix = getPhonePrefix(phone);
  if (!prefix) return null;
  if (MTN_PREFIXES.has(prefix)) return MOBILE_PROVIDERS.MTN;
  if (AIRTEL_PREFIXES.has(prefix)) return MOBILE_PROVIDERS.AIRTEL;
  return null;
};

export const isValidUgandaMobile = (phone) => {
  const normalized = normalizeUgandaPhone(phone);
  return /^\+256\d{9}$/.test(normalized || '');
};

export const providerMatchesPhone = (provider, phone) => {
  const detected = detectMobileProvider(phone);
  if (!detected) return true;
  return detected === String(provider || '').toUpperCase();
};

export const buildWithdrawalReference = (provider) => {
  const stamp = Date.now().toString().slice(-8);
  const prefix = provider === MOBILE_PROVIDERS.AIRTEL ? 'AM' : 'MM';
  return `${prefix}-DEMO-${stamp}`;
};

export const isSimulationWithdrawalMode = () => {
  const mode = String(process.env.PAYMENT_MODE || 'manual').toLowerCase();
  if (mode === 'simulation') return true;
  return String(process.env.SIMULATE_MOBILE_MONEY || 'true').toLowerCase() === 'true';
};

export const getProviderLabel = (provider) => {
  if (provider === MOBILE_PROVIDERS.AIRTEL) return 'Airtel Money';
  if (provider === MOBILE_PROVIDERS.MTN) return 'MTN Mobile Money';
  return provider;
};

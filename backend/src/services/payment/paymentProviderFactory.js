import { simulatePayment } from './simulationPaymentService.js';

export const isAutoPayoutEnabled = () => {
  return String(process.env.AUTO_PAYOUT_ON_VERIFY || 'false').toLowerCase() === 'true';
};

export const getConfiguredPaymentMode = () => {
  return String(process.env.PAYMENT_MODE || 'manual').toLowerCase();
};

export const getDefaultPaymentProvider = () => {
  return String(process.env.DEFAULT_PAYMENT_PROVIDER || 'SIMULATION').toUpperCase();
};

export const getPaymentProvider = (provider = getDefaultPaymentProvider()) => {
  const normalizedProvider = String(provider || getDefaultPaymentProvider()).toUpperCase();

  if (normalizedProvider === 'SIMULATION') {
    return simulatePayment;
  }

  throw new Error(`Payment provider not implemented yet: ${normalizedProvider}`);
};
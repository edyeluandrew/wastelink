import {
  MOBILE_PROVIDERS,
  buildWithdrawalReference,
  getProviderLabel,
  isSimulationWithdrawalMode,
} from '../../utils/mobileMoney.js';

const SIM_DELAY_MS = 1200;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const simulateMtnWithdrawal = async ({
  withdrawalId,
  pickerId,
  phone,
  amount,
  currency = 'UGX',
}) => {
  await wait(SIM_DELAY_MS);

  return {
    success: true,
    provider: MOBILE_PROVIDERS.MTN,
    provider_label: getProviderLabel(MOBILE_PROVIDERS.MTN),
    provider_transaction_id: buildWithdrawalReference(MOBILE_PROVIDERS.MTN),
    withdrawal_id: withdrawalId,
    picker_id: pickerId,
    phone,
    amount,
    currency,
    status: 'SUCCESS',
    is_simulated: true,
    message: 'Demo MTN Mobile Money sent successfully. No real funds transferred.',
    paid_at: new Date(),
  };
};

export const simulateAirtelWithdrawal = async ({
  withdrawalId,
  pickerId,
  phone,
  amount,
  currency = 'UGX',
}) => {
  await wait(SIM_DELAY_MS);

  return {
    success: true,
    provider: MOBILE_PROVIDERS.AIRTEL,
    provider_label: getProviderLabel(MOBILE_PROVIDERS.AIRTEL),
    provider_transaction_id: buildWithdrawalReference(MOBILE_PROVIDERS.AIRTEL),
    withdrawal_id: withdrawalId,
    picker_id: pickerId,
    phone,
    amount,
    currency,
    status: 'SUCCESS',
    is_simulated: true,
    message: 'Demo Airtel Money sent successfully. No real funds transferred.',
    paid_at: new Date(),
  };
};

export const simulateMobileMoneyWithdrawal = async (payload) => {
  const provider = String(payload.provider || MOBILE_PROVIDERS.MTN).toUpperCase();

  if (provider === MOBILE_PROVIDERS.AIRTEL) {
    return simulateAirtelWithdrawal(payload);
  }

  return simulateMtnWithdrawal(payload);
};

export { isSimulationWithdrawalMode };

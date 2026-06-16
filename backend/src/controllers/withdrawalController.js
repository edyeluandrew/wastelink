import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  createPickerWithdrawal,
  getWithdrawalBalance,
  getWithdrawalById,
  listWithdrawals,
} from '../services/payment/withdrawalService.js';
import { getProviderLabel, isSimulationWithdrawalMode } from '../utils/mobileMoney.js';

const requirePicker = (req, res) => {
  if (req.user?.role !== 'PICKER' || !req.user?.picker_id) {
    sendError(res, 'Only pickers can access this resource', 403);
    return false;
  }
  return true;
};

export const getMyWithdrawalBalance = async (req, res) => {
  try {
    if (!requirePicker(req, res)) return;

    const balance = await getWithdrawalBalance(req.user.picker_id);

    sendSuccess(res, 'Withdrawal balance fetched successfully', {
      ...balance,
      simulation_mode: isSimulationWithdrawalMode(),
      providers: [
        { id: 'MTN', label: getProviderLabel('MTN') },
        { id: 'AIRTEL', label: getProviderLabel('AIRTEL') },
      ],
    });
  } catch (error) {
    console.error('[Withdrawal Balance Error]', error.message);
    sendError(res, error.message || 'Failed to fetch withdrawal balance', error.status || 503);
  }
};

export const getWithdrawals = async (req, res) => {
  try {
    const isAdmin = ['SUPER_ADMIN', 'CITY_ADMIN'].includes(req.user?.role);
    const pickerId = req.user?.role === 'PICKER' ? req.user.picker_id : null;

    if (!isAdmin && !pickerId) {
      return sendError(res, 'Forbidden', 403);
    }

    const withdrawals = await listWithdrawals({
      pickerId: isAdmin && req.query.all === 'true' ? null : pickerId,
      limit: parseInt(req.query.limit || '20', 10),
    });

    sendSuccess(res, 'Withdrawals fetched successfully', withdrawals);
  } catch (error) {
    console.error('[Withdrawals List Error]', error.message);
    sendError(res, error.message || 'Failed to fetch withdrawals', error.status || 503);
  }
};

export const getWithdrawalDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = ['SUPER_ADMIN', 'CITY_ADMIN'].includes(req.user?.role);
    const pickerId = req.user?.role === 'PICKER' ? req.user.picker_id : null;

    if (!isAdmin && !pickerId) {
      return sendError(res, 'Forbidden', 403);
    }

    const withdrawal = await getWithdrawalById(id, isAdmin ? null : pickerId);

    if (!withdrawal) {
      return sendError(res, 'Withdrawal not found', 404);
    }

    sendSuccess(res, 'Withdrawal fetched successfully', withdrawal);
  } catch (error) {
    console.error('[Withdrawal Details Error]', error.message);
    sendError(res, error.message || 'Failed to fetch withdrawal', error.status || 503);
  }
};

export const requestWithdrawal = async (req, res) => {
  try {
    if (!requirePicker(req, res)) return;

    const { provider, phone, amount } = req.body || {};

    if (!provider || !phone) {
      return sendError(res, 'provider and phone are required', 400);
    }

    const result = await createPickerWithdrawal({
      pickerId: req.user.picker_id,
      provider,
      phone,
      amount,
      changedBy: req.user.id,
    });

    sendSuccess(res, result.simulation.message, {
      withdrawal: {
        id: result.withdrawal.id,
        provider: result.withdrawal.provider,
        provider_label: result.simulation.provider_label,
        phone: result.withdrawal.phone,
        amount: result.total_amount,
        currency: result.withdrawal.currency,
        status: result.withdrawal.status,
        payment_reference: result.withdrawal.payment_reference,
        is_simulated: true,
        jobs_count: result.jobs_count,
        created_at: result.withdrawal.created_at,
        completed_at: result.withdrawal.completed_at,
      },
      items: result.items,
      demo_notice: 'This is a simulated mobile money withdrawal. No real MTN or Airtel transfer was made.',
    }, 201);
  } catch (error) {
    console.error('[Withdrawal Request Error]', error.message);
    sendError(res, error.message || 'Withdrawal failed', error.status || 503);
  }
};

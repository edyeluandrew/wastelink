import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  createPickerWithdrawal,
  getWithdrawalBalance,
  getWithdrawalById,
  listWithdrawals,
  confirmWithdrawal,
  failWithdrawal,
  retryFailedWithdrawal,
  returnFailedWithdrawalToBalance,
} from '../services/payment/withdrawalService.js';
import { getProviderLabel } from '../utils/mobileMoney.js';

const requirePicker = (req, res) => {
  if (req.user?.role !== 'PICKER' || !req.user?.picker_id) {
    sendError(res, 'Only pickers can access this resource', 403);
    return false;
  }
  return true;
};

const requireAdmin = (req, res) => {
  if (!['SUPER_ADMIN', 'CITY_ADMIN'].includes(req.user?.role)) {
    sendError(res, 'Forbidden', 403);
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
      limit: parseInt(req.query.limit || '50', 10),
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

    sendSuccess(res, 'Withdrawal submitted — payout is processing', {
      withdrawal: {
        id: result.withdrawal.id,
        provider: result.withdrawal.provider,
        provider_label: getProviderLabel(result.withdrawal.provider),
        phone: result.withdrawal.phone,
        amount: result.total_amount,
        currency: result.withdrawal.currency,
        status: result.withdrawal.status,
        payment_reference: result.withdrawal.payment_reference,
        is_simulated: true,
        jobs_count: result.jobs_count,
        created_at: result.withdrawal.created_at,
      },
      items: result.items,
      demo_notice: result.demo_notice,
    }, 201);
  } catch (error) {
    console.error('[Withdrawal Request Error]', error.message);
    sendError(res, error.message || 'Withdrawal failed', error.status || 503);
  }
};

export const simulateConfirmWithdrawal = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const withdrawal = await confirmWithdrawal(req.params.id, {
      changedBy: req.user.id,
      notes: req.body?.notes || 'Admin simulated provider payment success',
    });
    sendSuccess(res, 'Withdrawal confirmed (demo)', withdrawal);
  } catch (error) {
    sendError(res, error.message || 'Failed to confirm withdrawal', error.status || 503);
  }
};

export const simulateFailWithdrawal = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const withdrawal = await failWithdrawal(req.params.id, {
      changedBy: req.user.id,
      reason: req.body?.reason || req.body?.notes || 'Admin simulated provider payment failure',
    });
    sendSuccess(res, 'Withdrawal marked failed (demo)', withdrawal);
  } catch (error) {
    sendError(res, error.message || 'Failed to fail withdrawal', error.status || 503);
  }
};

export const retryWithdrawalHandler = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const withdrawal = await retryFailedWithdrawal(req.params.id, { changedBy: req.user.id });
    sendSuccess(res, 'Withdrawal retry initiated', withdrawal);
  } catch (error) {
    sendError(res, error.message || 'Failed to retry withdrawal', error.status || 503);
  }
};

export const returnWithdrawalToBalanceHandler = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const withdrawal = await returnFailedWithdrawalToBalance(req.params.id, { changedBy: req.user.id });
    sendSuccess(res, 'Withdrawal returned to picker balance', withdrawal);
  } catch (error) {
    sendError(res, error.message || 'Failed to return withdrawal to balance', error.status || 503);
  }
};

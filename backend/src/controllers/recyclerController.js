import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  getDashboardStats,
  createPurchaseRequest,
  listPurchaseRequestsForRecycler,
  listPurchaseHistory,
  getRecyclerById,
  getPurchaseReceipt,
} from '../services/recyclerService.js';
import {
  listAvailableBatches,
  getBatchById,
} from '../services/wasteSaleBatchService.js';

const requireRecyclerId = (req, res) => {
  const recyclerId = req.user?.recycler_id;
  if (!recyclerId) {
    sendError(res, 'Recycler profile not linked to this account', 403);
    return null;
  }
  return recyclerId;
};

export const getRecyclerDashboard = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const stats = await getDashboardStats(recyclerId);
    const profile = await getRecyclerById(recyclerId);

    sendSuccess(res, 'Recycler dashboard loaded', { stats, profile });
  } catch (error) {
    next(error);
  }
};

export const getRecyclerInventory = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const city = req.user?.city || undefined;
    const batches = await listAvailableBatches({ city });
    sendSuccess(res, 'Available inventory loaded', { batches });
  } catch (error) {
    next(error);
  }
};

export const getRecyclerBatchDetails = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const batch = await getBatchById(req.params.batchId, { forRecycler: true });
    if (!batch) return sendError(res, 'Batch not found', 404);
    if (batch.status !== 'AVAILABLE') {
      return sendError(res, 'Batch is not available', 404);
    }

    sendSuccess(res, 'Batch details loaded', { batch });
  } catch (error) {
    next(error);
  }
};

export const postPurchaseRequest = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const { batch_id, requested_kg } = req.body;
    if (!batch_id || requested_kg === undefined) {
      return sendError(res, 'batch_id and requested_kg are required', 400);
    }

    const request = await createPurchaseRequest(recyclerId, {
      batch_id: parseInt(batch_id, 10),
      requested_kg,
    });

    sendSuccess(res, 'Purchase request submitted', { request }, 201);
  } catch (error) {
    if (error.message.includes('not available') || error.message.includes('exceeds')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getPurchaseRequests = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const requests = await listPurchaseRequestsForRecycler(recyclerId);
    sendSuccess(res, 'Purchase requests loaded', { requests });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseHistory = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const purchases = await listPurchaseHistory(recyclerId);
    sendSuccess(res, 'Purchase history loaded', { purchases });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseReceiptHandler = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const receipt = await getPurchaseReceipt(recyclerId, parseInt(req.params.requestId, 10));
    sendSuccess(res, 'Receipt loaded', { receipt });
  } catch (error) {
    if (error.message === 'Receipt not found') return sendError(res, error.message, 404);
    next(error);
  }
};

export const getRecyclerProfile = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const profile = await getRecyclerById(recyclerId);
    sendSuccess(res, 'Profile loaded', { profile });
  } catch (error) {
    next(error);
  }
};

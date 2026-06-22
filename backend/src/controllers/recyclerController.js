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
  getInventorySummaryForRecycler,
  getCollectionPointsForWasteType,
} from '../services/recyclerInventoryService.js';
import { getBatchById } from '../services/wasteSaleBatchService.js';

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

export const getInventorySummary = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const { summary } = await getInventorySummaryForRecycler(recyclerId);
    sendSuccess(res, 'Inventory summary loaded', { summary });
  } catch (error) {
    next(error);
  }
};

export const getInventoryCollectionPoints = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const wasteTypeKey = req.params.wasteTypeId;
    const collectionPoints = await getCollectionPointsForWasteType(recyclerId, wasteTypeKey);
    sendSuccess(res, 'Collection point breakdown loaded', { collection_points: collectionPoints });
  } catch (error) {
    next(error);
  }
};

/** @deprecated use inventory-summary */
export const getRecyclerInventory = async (req, res, next) => {
  try {
    const recyclerId = requireRecyclerId(req, res);
    if (!recyclerId) return;

    const { summary } = await getInventorySummaryForRecycler(recyclerId);
    sendSuccess(res, 'Available inventory loaded', { summary });
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
    if (batch.status !== 'AVAILABLE' || Number(batch.available_kg) <= 0) {
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

    const { batch_id, requested_kg, recycler_note } = req.body;
    if (!batch_id || requested_kg === undefined) {
      return sendError(res, 'batch_id and requested_kg are required', 400);
    }

    const request = await createPurchaseRequest(recyclerId, {
      batch_id: parseInt(batch_id, 10),
      requested_kg,
      recycler_note,
    });

    sendSuccess(res, 'Purchase request submitted', { request }, 201);
  } catch (error) {
    const clientErrors = ['not available', 'exceeds', 'not active', 'not in your', 'accepted waste', 'pending request', 'no longer'];
    if (clientErrors.some((m) => error.message.toLowerCase().includes(m.toLowerCase()))) {
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

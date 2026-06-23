import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  listRecyclers,
  createRecycler,
  updateRecycler,
  getRecyclerById,
  listAdminPurchaseRequests,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  schedulePickup,
  confirmPickup,
  recordPayment,
  markSold,
  getRevenueSummary,
} from '../services/recyclerService.js';
import {
  listAdminBatches,
  createSaleBatch,
  updateSaleBatch,
  getBatchById,
  getVerifiedInventorySummary,
  listVerifiedWasteLogs,
} from '../services/wasteSaleBatchService.js';
import { normalizeCity, DEFAULT_CITY } from '../utils/cityScope.js';

const adminCity = (req) => {
  if (req.user?.role === 'CITY_ADMIN' && req.user?.city) {
    return normalizeCity(req.user.city);
  }
  return undefined;
};

export const getRecyclers = async (req, res, next) => {
  try {
    const recyclers = await listRecyclers({ status: req.query.status, city: adminCity(req) });
    sendSuccess(res, 'Recyclers loaded', { recyclers });
  } catch (error) {
    next(error);
  }
};

export const postRecycler = async (req, res, next) => {
  try {
    const result = await createRecycler(req.body, req.user.id);
    sendSuccess(res, 'Recycler created', result, 201);
  } catch (error) {
    if (error.code === '23505') return sendError(res, 'Email or phone already exists', 409);
    next(error);
  }
};

export const patchRecycler = async (req, res, next) => {
  try {
    const recycler = await updateRecycler(parseInt(req.params.id, 10), req.body, req.user.id);
    sendSuccess(res, 'Recycler updated', { recycler });
  } catch (error) {
    if (error.message === 'Recycler not found') return sendError(res, error.message, 404);
    next(error);
  }
};

export const getRecyclerByIdHandler = async (req, res, next) => {
  try {
    const recycler = await getRecyclerById(parseInt(req.params.id, 10));
    if (!recycler) return sendError(res, 'Recycler not found', 404);
    sendSuccess(res, 'Recycler loaded', { recycler });
  } catch (error) {
    next(error);
  }
};

export const getWasteSaleBatches = async (req, res, next) => {
  try {
    const batches = await listAdminBatches({ status: req.query.status, city: adminCity(req) });
    sendSuccess(res, 'Sale batches loaded', { batches });
  } catch (error) {
    next(error);
  }
};

export const postWasteSaleBatch = async (req, res, next) => {
  try {
    const batch = await createSaleBatch(
      { ...req.body, city: req.body.city || adminCity(req) || DEFAULT_CITY },
      req.user.id
    );
    sendSuccess(res, 'Sale batch created', { batch }, 201);
  } catch (error) {
    if (error.message.includes('price') || error.message.includes('Invalid')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const patchWasteSaleBatch = async (req, res, next) => {
  try {
    const batch = await updateSaleBatch(parseInt(req.params.id, 10), req.body, req.user.id);
    sendSuccess(res, 'Sale batch updated', { batch });
  } catch (error) {
    if (error.message === 'Batch not found') return sendError(res, error.message, 404);
    if (error.message.includes('Sold') || error.message.includes('price')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getVerifiedInventory = async (req, res, next) => {
  try {
    const summary = await getVerifiedInventorySummary({ city: adminCity(req) });
    sendSuccess(res, 'Verified inventory summary loaded', { summary });
  } catch (error) {
    next(error);
  }
};

export const getVerifiedWasteLogs = async (req, res, next) => {
  try {
    const logs = await listVerifiedWasteLogs({
      collection_point_id: req.query.collection_point_id,
      waste_type: req.query.waste_type,
    });
    sendSuccess(res, 'Verified waste logs loaded', { logs });
  } catch (error) {
    next(error);
  }
};

export const getAdminPurchaseRequests = async (req, res, next) => {
  try {
    const requests = await listAdminPurchaseRequests({ status: req.query.status });
    sendSuccess(res, 'Purchase requests loaded', { requests });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (req, res, next) => {
  try {
    const request = await approvePurchaseRequest(parseInt(req.params.id, 10), req.user.id, req.body);
    sendSuccess(res, 'Request approved', { request });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('pending')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const request = await rejectPurchaseRequest(parseInt(req.params.id, 10), req.user.id, req.body);
    sendSuccess(res, 'Request rejected', { request });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('pending')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const scheduleRequestPickup = async (req, res, next) => {
  try {
    const request = await schedulePickup(parseInt(req.params.id, 10), req.user.id, req.body);
    sendSuccess(res, 'Pickup scheduled', { request });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('approved')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const confirmRequestPickup = async (req, res, next) => {
  try {
    const request = await confirmPickup(parseInt(req.params.id, 10), req.user.id, req.body);
    sendSuccess(res, 'Pickup confirmed', { request });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('must')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const recordRequestPayment = async (req, res, next) => {
  try {
    const payment = await recordPayment(parseInt(req.params.id, 10), req.user.id, req.body);
    sendSuccess(res, 'Payment recorded', { payment });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('must')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const markRequestSold = async (req, res, next) => {
  try {
    const result = await markSold(parseInt(req.params.id, 10), req.user.id);
    sendSuccess(res, 'Batch marked as sold', result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('must')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getRecyclerRevenueSummary = async (req, res, next) => {
  try {
    const summary = await getRevenueSummary();
    sendSuccess(res, 'Revenue summary loaded', { summary });
  } catch (error) {
    next(error);
  }
};

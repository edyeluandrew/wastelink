import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getRecyclers,
  postRecycler,
  patchRecycler,
  getRecyclerByIdHandler,
  getWasteSaleBatches,
  postWasteSaleBatch,
  patchWasteSaleBatch,
  getVerifiedInventory,
  getVerifiedWasteLogs,
  getAdminPurchaseRequests,
  approveRequest,
  rejectRequest,
  scheduleRequestPickup,
  confirmRequestPickup,
  recordRequestPayment,
  markRequestSold,
  getRecyclerRevenueSummary,
} from '../controllers/adminRecyclerController.js';

const router = Router();
const adminRoles = ['SUPER_ADMIN', 'CITY_ADMIN'];

router.use(requireAuth, requireRole(adminRoles));

router.get('/recyclers', getRecyclers);
router.post('/recyclers', postRecycler);
router.get('/recyclers/:id', getRecyclerByIdHandler);
router.patch('/recyclers/:id', patchRecycler);

router.get('/waste-sale-batches', getWasteSaleBatches);
router.post('/waste-sale-batches', postWasteSaleBatch);
router.patch('/waste-sale-batches/:id', patchWasteSaleBatch);
router.get('/verified-inventory-summary', getVerifiedInventory);
router.get('/verified-waste-logs', getVerifiedWasteLogs);

router.get('/recycler-purchase-requests', getAdminPurchaseRequests);
router.post('/recycler-purchase-requests/:id/approve', approveRequest);
router.post('/recycler-purchase-requests/:id/reject', rejectRequest);
router.post('/recycler-purchase-requests/:id/schedule-pickup', scheduleRequestPickup);
router.post('/recycler-purchase-requests/:id/confirm-pickup', confirmRequestPickup);
router.post('/recycler-purchase-requests/:id/record-payment', recordRequestPayment);
router.post('/recycler-purchase-requests/:id/mark-sold', markRequestSold);

router.get('/recycler-revenue-summary', getRecyclerRevenueSummary);

export default router;

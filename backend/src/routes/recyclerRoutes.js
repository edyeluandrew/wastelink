import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getRecyclerDashboard,
  getRecyclerInventory,
  getRecyclerBatchDetails,
  postPurchaseRequest,
  getPurchaseRequests,
  getPurchaseHistory,
  getRecyclerProfile,
  getPurchaseReceiptHandler,
} from '../controllers/recyclerController.js';

const router = Router();
const recyclerRole = ['RECYCLER'];

router.use(requireAuth, requireRole(recyclerRole));

router.get('/dashboard', getRecyclerDashboard);
router.get('/inventory', getRecyclerInventory);
router.get('/inventory/:batchId', getRecyclerBatchDetails);
router.post('/purchase-requests', postPurchaseRequest);
router.get('/purchase-requests', getPurchaseRequests);
router.get('/purchases', getPurchaseHistory);
router.get('/purchases/:requestId/receipt', getPurchaseReceiptHandler);
router.get('/profile', getRecyclerProfile);

export default router;

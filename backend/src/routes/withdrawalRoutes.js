import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getMyWithdrawalBalance,
  getWithdrawals,
  getWithdrawalDetails,
  requestWithdrawal,
} from '../controllers/withdrawalController.js';

const router = Router();

router.get('/balance', requireAuth, getMyWithdrawalBalance);
router.get('/', requireAuth, getWithdrawals);
router.get('/:id', requireAuth, getWithdrawalDetails);
router.post('/', requireAuth, requestWithdrawal);

export default router;

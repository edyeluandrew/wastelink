import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getMyWithdrawalBalance,
  getWithdrawals,
  getWithdrawalDetails,
  requestWithdrawal,
  simulateConfirmWithdrawal,
  simulateFailWithdrawal,
  retryWithdrawalHandler,
  returnWithdrawalToBalanceHandler,
} from '../controllers/withdrawalController.js';

const router = Router();

router.get('/balance', requireAuth, getMyWithdrawalBalance);
router.get('/', requireAuth, getWithdrawals);
router.post('/', requireAuth, requestWithdrawal);
router.patch('/:id/simulate-confirm', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), simulateConfirmWithdrawal);
router.patch('/:id/simulate-fail', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), simulateFailWithdrawal);
router.patch('/:id/retry', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), retryWithdrawalHandler);
router.patch('/:id/return-to-balance', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), returnWithdrawalToBalanceHandler);
router.get('/:id', requireAuth, getWithdrawalDetails);

export default router;

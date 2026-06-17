import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getReportingCategories,
  createReportingCategory,
  updateReportingCategory,
} from '../controllers/reportingCategoryController.js';

const router = Router();

router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN', 'AGENT']), getReportingCategories);
router.post('/', requireAuth, requireRole(['SUPER_ADMIN']), createReportingCategory);
router.patch('/:id', requireAuth, requireRole(['SUPER_ADMIN']), updateReportingCategory);

export default router;

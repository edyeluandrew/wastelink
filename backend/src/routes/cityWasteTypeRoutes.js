import { Router } from 'express';
import { requireAuth, requireRole, optionalAuth } from '../middleware/authMiddleware.js';
import {
  getCityWasteTypes,
  getActiveCityWasteTypes,
  getCityWasteType,
  createCityWasteTypeHandler,
  updateCityWasteTypeHandler,
  getCityWasteTypeHistoryHandler,
} from '../controllers/cityWasteTypeController.js';

const router = Router();

router.get('/active', optionalAuth, getActiveCityWasteTypes);
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), getCityWasteTypes);
router.get('/:id/history', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), getCityWasteTypeHistoryHandler);
router.get('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), getCityWasteType);
router.post('/', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), createCityWasteTypeHandler);
router.patch('/:id', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), updateCityWasteTypeHandler);

export default router;

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getCities,
  getPublicCities,
  getDefaultCity,
  createCityHandler,
  updateCityHandler,
} from '../controllers/cityController.js';

const router = Router();

router.get('/public', getPublicCities);
router.get('/default', getDefaultCity);
router.get('/', requireAuth, requireRole(['SUPER_ADMIN', 'CITY_ADMIN']), getCities);
router.post('/', requireAuth, requireRole(['SUPER_ADMIN']), createCityHandler);
router.patch('/:id', requireAuth, requireRole(['SUPER_ADMIN']), updateCityHandler);

export default router;

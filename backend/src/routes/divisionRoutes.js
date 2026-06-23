import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  createDivision,
  getDivisions,
  getDivisionStats,
  getPublicDivisions,
  updateDivision,
} from '../controllers/divisionController.js';

const router = Router();
const adminRoles = ['SUPER_ADMIN', 'CITY_ADMIN'];

router.get('/public', getPublicDivisions);
router.get('/stats', requireAuth, requireRole(adminRoles), getDivisionStats);
router.get('/', requireAuth, requireRole(adminRoles), getDivisions);
router.post('/', requireAuth, requireRole(adminRoles), createDivision);
router.patch('/:id', requireAuth, requireRole(adminRoles), updateDivision);

export default router;

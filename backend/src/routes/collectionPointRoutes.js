import { Router } from "express";
import { optionalAuth, requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  createCollectionPoint,
  getCollectionPoints,
  getCollectionPointById,
  updateCollectionPoint,
  deactivateCollectionPoint,
} from "../controllers/collectionPointController.js";

const router = Router();
const adminRoles = ["SUPER_ADMIN", "CITY_ADMIN"];

router.use(optionalAuth);

router.post("/", requireAuth, requireRole(adminRoles), createCollectionPoint);
router.get("/", getCollectionPoints);
router.get("/:id", getCollectionPointById);
router.patch("/:id", requireAuth, requireRole(adminRoles), updateCollectionPoint);
router.patch("/:id/deactivate", requireAuth, requireRole(adminRoles), deactivateCollectionPoint);

export default router;

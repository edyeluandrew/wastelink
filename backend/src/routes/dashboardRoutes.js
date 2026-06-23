import { Router } from "express";
import {
  getDashboardStats,
  getDashboardDivisions,
  getDashboardRecentLogs,
  getDashboardWasteTypes,
  getDashboardTopPickers,
  getDashboardCollectionPointPerformance,
  getDashboardToday,
} from "../controllers/dashboardController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(optionalAuth);

router.get("/stats", getDashboardStats);
router.get("/divisions", getDashboardDivisions);
router.get("/recent-logs", getDashboardRecentLogs);
router.get("/waste-types", getDashboardWasteTypes);
router.get("/top-pickers", getDashboardTopPickers);
router.get("/collection-point-performance", getDashboardCollectionPointPerformance);
router.get("/today", getDashboardToday);

export default router;

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  getMonthlyReport,
  getPlatformSummary,
  getUndpPilotReport,
} from "../controllers/reportController.js";
import {
  downloadCityReportPdf,
  downloadCityReportXlsx,
  getReportExportMeta,
} from "../controllers/reportExportController.js";

const router = Router();
const adminRoles = ["SUPER_ADMIN", "CITY_ADMIN"];

router.get("/monthly", getMonthlyReport);
router.get("/summary", getPlatformSummary);
router.get("/undp-pilot", getUndpPilotReport);

router.get("/export/meta", requireAuth, requireRole(adminRoles), getReportExportMeta);
router.get("/export/xlsx", requireAuth, requireRole(adminRoles), downloadCityReportXlsx);
router.get("/export/pdf", requireAuth, requireRole(adminRoles), downloadCityReportPdf);

export default router;

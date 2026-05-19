import { Router } from "express";
import {
  getMonthlyReport,
  getPlatformSummary,
  getUndpPilotReport,
} from "../controllers/reportController.js";

const router = Router();

router.get("/monthly", getMonthlyReport);
router.get("/summary", getPlatformSummary);
router.get("/undp-pilot", getUndpPilotReport);

export default router;

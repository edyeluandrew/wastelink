import { Router } from "express";
import {
  createWasteLog,
  getWasteLogs,
  getWasteLogById,
  getWasteLogByJobCode,
  verifyWasteLog,
  rejectWasteLog,
  markWasteLogPaid,
  approvePayout,
  initiatePayout,
  simulatePayoutConfirm,
  simulatePayoutFail,
  retryPayout,
  returnPayoutToBalance,
} from "../controllers/wasteLogController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", optionalAuth, createWasteLog);
router.get("/", optionalAuth, getWasteLogs);
router.get("/search", getWasteLogByJobCode); // Search by query param (must come BEFORE /:id)
router.get("/job/:jobCode", getWasteLogByJobCode); // Search by path param
router.get("/:id", getWasteLogById);
router.patch("/:id/verify", optionalAuth, verifyWasteLog);
router.patch("/:id/reject", optionalAuth, rejectWasteLog);
router.patch("/:id/payout/approve", requireAuth, approvePayout);
router.patch("/:id/payout/initiate", requireAuth, initiatePayout);
router.patch("/:id/payout/simulate-confirm", requireAuth, simulatePayoutConfirm);
router.patch("/:id/payout/simulate-fail", requireAuth, simulatePayoutFail);
router.patch("/:id/payout/retry", requireAuth, retryPayout);
router.patch("/:id/payout/return-to-balance", requireAuth, returnPayoutToBalance);
router.patch("/:id/mark-paid", requireAuth, markWasteLogPaid);

export default router;

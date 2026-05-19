import { Router } from "express";
import {
  createWasteLog,
  getWasteLogs,
  getWasteLogById,
  getWasteLogByJobCode,
  verifyWasteLog,
  rejectWasteLog,
  markWasteLogPaid,
} from "../controllers/wasteLogController.js";

const router = Router();

router.post("/", createWasteLog);
router.get("/", getWasteLogs);
router.get("/job/:jobCode", getWasteLogByJobCode);
router.get("/:id", getWasteLogById);
router.patch("/:id/verify", verifyWasteLog);
router.patch("/:id/reject", rejectWasteLog);
router.patch("/:id/mark-paid", markWasteLogPaid);

export default router;

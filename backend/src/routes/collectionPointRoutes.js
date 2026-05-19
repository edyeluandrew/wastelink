import { Router } from "express";
import {
  createCollectionPoint,
  getCollectionPoints,
  getCollectionPointById,
  updateCollectionPoint,
  deactivateCollectionPoint,
} from "../controllers/collectionPointController.js";

const router = Router();

router.post("/", createCollectionPoint);
router.get("/", getCollectionPoints);
router.get("/:id", getCollectionPointById);
router.patch("/:id", updateCollectionPoint);
router.patch("/:id/deactivate", deactivateCollectionPoint);

export default router;

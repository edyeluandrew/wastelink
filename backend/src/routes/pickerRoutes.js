import { Router } from "express";
import {
  createPicker,
  getPickers,
  getPickerById,
  updatePicker,
} from "../controllers/pickerController.js";

const router = Router();

router.post("/", createPicker);
router.get("/", getPickers);
router.get("/:id", getPickerById);
router.patch("/:id", updatePicker);

export default router;

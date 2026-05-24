import { Router } from "express";
import { login, me, registerPicker } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.post("/register-picker", registerPicker);
router.get("/me", requireAuth, me);

export default router;
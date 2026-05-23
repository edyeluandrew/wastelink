import { Router } from "express";
import {
  activateUser,
  createUser,
  deactivateUser,
  getUserById,
  getUsers,
  resetPassword,
  updateUser,
} from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

const adminRoles = ["SUPER_ADMIN", "CITY_ADMIN"];

router.use(requireAuth);

router.post("/", requireRole(adminRoles), createUser);
router.get("/", requireRole(adminRoles), getUsers);
router.get("/:id", requireRole(adminRoles), getUserById);
router.patch("/:id", requireRole(adminRoles), updateUser);
router.patch("/:id/deactivate", requireRole(adminRoles), deactivateUser);
router.patch("/:id/activate", requireRole(adminRoles), activateUser);
router.patch("/:id/reset-password", requireRole(adminRoles), resetPassword);

export default router;
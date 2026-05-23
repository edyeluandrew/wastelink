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

const router = Router();

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.patch("/:id/deactivate", deactivateUser);
router.patch("/:id/activate", activateUser);
router.patch("/:id/reset-password", resetPassword);

export default router;
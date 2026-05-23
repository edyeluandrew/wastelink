import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { fetchSafeUserById } from "../middleware/authMiddleware.js";

const safeUserFromRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
});

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const result = await pool.query(
      "SELECT id, name, email, password_hash, role, status FROM users WHERE email = $1 LIMIT 1",
      [String(email).trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Invalid email or password", 401);
    }

    const user = result.rows[0];

    if (user.status !== "ACTIVE") {
      return sendError(res, "Account is inactive", 403);
    }

    if (user.role !== "SUPER_ADMIN") {
      return sendError(res, "Invalid email or password", 401);
    }

    if (!user.password_hash) {
      return sendError(res, "Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return sendError(res, "Invalid email or password", 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return sendError(res, "Authentication is not configured", 500);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return sendSuccess(res, "Login successful", {
      token,
      user: safeUserFromRow(user),
    });
  } catch (error) {
    console.error("[Auth Login Error]", { code: error.code, message: error.message });
    return sendError(res, "Login failed", 500);
  }
};

export const me = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const user = await fetchSafeUserById(userId);
    if (!user) {
      return sendError(res, "Unauthorized", 401);
    }

    return sendSuccess(res, "Authenticated user fetched successfully", {
      user,
    });
  } catch (error) {
    console.error("[Auth Me Error]", { code: error.code, message: error.message });
    return sendError(res, "Failed to fetch authenticated user", 500);
  }
};
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { fetchSafeUserById } from "../middleware/authMiddleware.js";
import { safeUserFromRow } from "../utils/userHelpers.js";

export const login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = String(identifier ?? email ?? "").trim();

    if (!loginIdentifier || !password) {
      return sendError(res, "Email or phone and password are required", 400);
    }

    const result = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.password_hash,
        u.role,
        u.city,
        u.division,
        u.collection_point_id,
        cp.point_code AS collection_point_point_code,
        cp.name AS collection_point_name,
        cp.division AS collection_point_division,
        cp.agent_name AS collection_point_agent_name,
        cp.agent_phone AS collection_point_agent_phone,
        cp.status AS collection_point_status,
        u.picker_id,
        p.name AS picker_name,
        u.status,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN collection_points cp ON u.collection_point_id = cp.id
      LEFT JOIN pickers p ON u.picker_id = p.id
      WHERE LOWER(u.email) = $1 OR u.phone = $2
      LIMIT 1`,
      [loginIdentifier.toLowerCase(), loginIdentifier]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Invalid email or password", 401);
    }

    const user = result.rows[0];

    if (user.status !== "ACTIVE") {
      return sendError(res, "Account is inactive", 403);
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
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendError } from "../utils/apiResponse.js";

const safeUserFromRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
});

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return sendError(res, "Unauthorized", 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return sendError(res, "Authentication is not configured", 500);
    }

    const payload = jwt.verify(token, secret);

    const userId = payload.userId || payload.id;
    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    req.user = {
      id: userId,
      role: payload.role,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.error("[Auth Middleware]", { message: error.message });
    return sendError(res, "Unauthorized", 401);
  }
};

export const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(res, "Forbidden", 403);
    }

    next();
  };
};

export const fetchSafeUserById = async (userId) => {
  const result = await pool.query(
    "SELECT id, name, email, role, status FROM users WHERE id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return safeUserFromRow(result.rows[0]);
};
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendError } from "../utils/apiResponse.js";
import { safeUserFromRow } from "../utils/userHelpers.js";

const authUserSelectQuery = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.phone,
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
`;

const loadUserById = async (userId) => {
  const result = await pool.query(`${authUserSelectQuery} WHERE u.id = $1 LIMIT 1`, [userId]);

  if (result.rows.length === 0) {
    return null;
  }

  return safeUserFromRow(result.rows[0]);
};

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

    const user = await loadUserById(userId);

    if (!user) {
      return sendError(res, "Unauthorized", 401);
    }

    if (user.status !== "ACTIVE") {
      return sendError(res, "Account is inactive", 403);
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("[Auth Middleware]", { message: error.message });
    return sendError(res, "Unauthorized", 401);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader) {
      return next();
    }

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

    const user = await loadUserById(userId);
    if (!user) {
      return sendError(res, "Unauthorized", 401);
    }

    if (user.status !== "ACTIVE") {
      return sendError(res, "Account is inactive", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[Optional Auth Middleware]", { message: error.message });
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
  return loadUserById(userId);
};
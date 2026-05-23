import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
  ALLOWED_USER_ROLES,
  ALLOWED_USER_STATUSES,
  ensureUsersTableSchema,
  normalizeUserRole,
  normalizeUserStatus,
  safeUserFromRow,
  validateUserRoleRules,
} from "../utils/userHelpers.js";

const userSelectQuery = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.phone,
    u.role,
    u.city,
    u.division,
    u.collection_point_id,
    cp.name AS collection_point_name,
    u.picker_id,
    p.name AS picker_name,
    u.status,
    u.created_at,
    u.updated_at
  FROM users u
  LEFT JOIN collection_points cp ON u.collection_point_id = cp.id
  LEFT JOIN pickers p ON u.picker_id = p.id
`;

const getUserByEmail = async (email, excludeId = null) => {
  const params = [email];
  let query = "SELECT id FROM users WHERE email = $1";
  if (excludeId) {
    query += " AND id != $2";
    params.push(excludeId);
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const getUserByPhone = async (phone, excludeId = null) => {
  const params = [phone];
  let query = "SELECT id FROM users WHERE phone = $1";
  if (excludeId) {
    query += " AND id != $2";
    params.push(excludeId);
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const getCollectionPoint = async (collectionPointId) => {
  const result = await pool.query(
    "SELECT id, name, division, status FROM collection_points WHERE id = $1 LIMIT 1",
    [collectionPointId]
  );
  return result.rows[0] || null;
};

const getPicker = async (pickerId) => {
  const result = await pool.query(
    "SELECT id, picker_code, name, status FROM pickers WHERE id = $1 LIMIT 1",
    [pickerId]
  );
  return result.rows[0] || null;
};

export const createUser = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const {
      name,
      email,
      phone,
      password,
      role,
      city,
      division,
      collection_point_id,
      picker_id,
      status,
    } = req.body;

    if (!name || !role || !password) {
      return sendError(res, "name, role, and password are required", 400);
    }

    if (!email && !phone) {
      return sendError(res, "Either email or phone is required", 400);
    }

    const normalizedRole = normalizeUserRole(role);
    if (!ALLOWED_USER_ROLES.includes(normalizedRole)) {
      return sendError(res, "Unsupported user role", 400);
    }

    const normalizedStatus = normalizeUserStatus(status);
    if (!ALLOWED_USER_STATUSES.includes(normalizedStatus)) {
      return sendError(res, "Unsupported user status", 400);
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const normalizedPhone = phone ? String(phone).trim() : null;

    if (normalizedEmail) {
      const duplicateEmail = await getUserByEmail(normalizedEmail);
      if (duplicateEmail) {
        return sendError(res, "Email already exists", 400);
      }
    }

    if (normalizedPhone) {
      const duplicatePhone = await getUserByPhone(normalizedPhone);
      if (duplicatePhone) {
        return sendError(res, "Phone already exists", 400);
      }
    }

    if (normalizedRole === 'AGENT') {
      if (!collection_point_id) {
        return sendError(res, 'AGENT users must be assigned to a collection point', 400);
      }

      const collectionPoint = await getCollectionPoint(collection_point_id);
      if (!collectionPoint) {
        return sendError(res, 'Collection point not found', 404);
      }
    }

    if (normalizedRole === 'PICKER' && picker_id) {
      const picker = await getPicker(picker_id);
      if (!picker) {
        return sendError(res, 'Picker not found', 404);
      }
    }

    if (normalizedRole === 'CITY_ADMIN' && !city) {
      return sendError(res, 'CITY_ADMIN users must have a city', 400);
    }

    const roleRuleError = validateUserRoleRules({
      role: normalizedRole,
      city,
      collection_point_id,
    });
    if (roleRuleError) {
      return sendError(res, roleRuleError, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (
        name, email, phone, password_hash, role, city, division, collection_point_id, picker_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, email, phone, role, city, division, collection_point_id, picker_id, status, created_at, updated_at`,
      [
        String(name).trim(),
        normalizedEmail,
        normalizedPhone,
        passwordHash,
        normalizedRole,
        city || null,
        division || null,
        collection_point_id || null,
        picker_id || null,
        normalizedStatus,
      ]
    );

    const createdUser = result.rows[0];
    return sendSuccess(res, 'User created successfully', safeUserFromRow(createdUser), 201);
  } catch (error) {
    console.error('[Create User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to create user', 500);
  }
};

export const getUsers = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const { role, status, city, collection_point_id } = req.query;
    const params = [];
    const clauses = [];

    if (role) {
      params.push(normalizeUserRole(role));
      clauses.push(`u.role = $${params.length}`);
    }
    if (status) {
      params.push(normalizeUserStatus(status));
      clauses.push(`u.status = $${params.length}`);
    }
    if (city) {
      params.push(city);
      clauses.push(`u.city = $${params.length}`);
    }
    if (collection_point_id) {
      params.push(collection_point_id);
      clauses.push(`u.collection_point_id = $${params.length}`);
    }

    const query = `${userSelectQuery}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY u.created_at DESC`;
    const result = await pool.query(query, params);

    return sendSuccess(res, 'Users retrieved successfully', result.rows.map(safeUserFromRow));
  } catch (error) {
    console.error('[Get Users Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to fetch users', 500);
  }
};

export const getUserById = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const { id } = req.params;
    const result = await pool.query(`${userSelectQuery} WHERE u.id = $1 LIMIT 1`, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, 'User retrieved successfully', safeUserFromRow(result.rows[0]));
  } catch (error) {
    console.error('[Get User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to fetch user', 500);
  }
};

export const updateUser = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const { id } = req.params;
    const existingResult = await pool.query('SELECT id, role FROM users WHERE id = $1 LIMIT 1', [id]);

    if (existingResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const existingUser = existingResult.rows[0];
    const {
      name,
      email,
      phone,
      role,
      city,
      division,
      collection_point_id,
      picker_id,
      status,
    } = req.body;

    const updates = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(String(name).trim());
    }

    if (email !== undefined) {
      const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
      if (normalizedEmail) {
        const duplicateEmail = await getUserByEmail(normalizedEmail, id);
        if (duplicateEmail) {
          return sendError(res, 'Email already exists', 400);
        }
      }
      updates.push(`email = $${index++}`);
      values.push(normalizedEmail);
    }

    if (phone !== undefined) {
      const normalizedPhone = phone ? String(phone).trim() : null;
      if (normalizedPhone) {
        const duplicatePhone = await getUserByPhone(normalizedPhone, id);
        if (duplicatePhone) {
          return sendError(res, 'Phone already exists', 400);
        }
      }
      updates.push(`phone = $${index++}`);
      values.push(normalizedPhone);
    }

    let normalizedRole = existingUser.role;
    if (role !== undefined) {
      normalizedRole = normalizeUserRole(role);
      if (!ALLOWED_USER_ROLES.includes(normalizedRole)) {
        return sendError(res, 'Unsupported user role', 400);
      }
      updates.push(`role = $${index++}`);
      values.push(normalizedRole);
    }

    if (city !== undefined) {
      updates.push(`city = $${index++}`);
      values.push(city || null);
    }

    if (division !== undefined) {
      updates.push(`division = $${index++}`);
      values.push(division || null);
    }

    if (collection_point_id !== undefined) {
      if (collection_point_id) {
        const collectionPoint = await getCollectionPoint(collection_point_id);
        if (!collectionPoint) {
          return sendError(res, 'Collection point not found', 404);
        }
      }
      updates.push(`collection_point_id = $${index++}`);
      values.push(collection_point_id || null);
    }

    if (picker_id !== undefined) {
      if (picker_id) {
        const picker = await getPicker(picker_id);
        if (!picker) {
          return sendError(res, 'Picker not found', 404);
        }
      }
      updates.push(`picker_id = $${index++}`);
      values.push(picker_id || null);
    }

    if (status !== undefined) {
      const normalizedStatus = normalizeUserStatus(status);
      if (!ALLOWED_USER_STATUSES.includes(normalizedStatus)) {
        return sendError(res, 'Unsupported user status', 400);
      }
      updates.push(`status = $${index++}`);
      values.push(normalizedStatus);
    }

    const finalRole = normalizedRole;
    const finalCity = city !== undefined ? city : null;
    const finalCollectionPointId = collection_point_id !== undefined ? collection_point_id : null;

    const roleRuleError = validateUserRoleRules({
      role: finalRole,
      city: finalCity,
      collection_point_id: finalCollectionPointId,
    });
    if (roleRuleError) {
      return sendError(res, roleRuleError, 400);
    }

    if (updates.length === 0) {
      return sendError(res, 'No fields to update', 400);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${index} RETURNING id, name, email, phone, role, city, division, collection_point_id, picker_id, status, created_at, updated_at`,
      values
    );

    return sendSuccess(res, 'User updated successfully', safeUserFromRow(result.rows[0]));
  } catch (error) {
    console.error('[Update User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to update user', 500);
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET status = 'INACTIVE', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, phone, role, city, division, collection_point_id, picker_id, status, created_at, updated_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, 'User deactivated successfully', safeUserFromRow(result.rows[0]));
  } catch (error) {
    console.error('[Deactivate User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to deactivate user', 500);
  }
};

export const activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, phone, role, city, division, collection_point_id, picker_id, status, created_at, updated_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, 'User activated successfully', safeUserFromRow(result.rows[0]));
  } catch (error) {
    console.error('[Activate User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to activate user', 500);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return sendError(res, 'Password is required', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id, passwordHash]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, 'Password reset successfully', { success: true });
  } catch (error) {
    console.error('[Reset Password Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to reset password', 500);
  }
};
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import {
  ALLOWED_USER_ROLES,
  ALLOWED_USER_STATUSES,
  canCreateRole,
  canManageUser,
  canResetPassword,
  ensureUsersTableSchema,
  normalizeUserRole,
  normalizeUserStatus,
  safeUserFromRow,
  validateUserRoleRules,
} from '../utils/userHelpers.js';

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
    cp.point_code AS collection_point_point_code,
    cp.name AS collection_point_name,
    cp.division AS collection_point_division,
    cp.agent_name AS collection_point_agent_name,
    cp.agent_phone AS collection_point_agent_phone,
    cp.status AS collection_point_status,
    u.picker_id,
    p.picker_code AS picker_code,
    p.name AS picker_name,
    p.phone AS picker_phone,
    p.gender AS picker_gender,
    p.age_group AS picker_age_group,
    p.division AS picker_division,
    p.main_waste_type AS picker_main_waste_type,
    p.status AS picker_status,
    u.status,
    u.created_at,
    u.updated_at
  FROM users u
  LEFT JOIN collection_points cp ON u.collection_point_id = cp.id
  LEFT JOIN pickers p ON u.picker_id = p.id
`;

const getActorRole = (user) => normalizeUserRole(user?.role);

const getActorCity = (user) => (user?.city ? String(user.city).trim() : null);

const getUserByEmail = async (email, excludeId = null) => {
  const params = [email];
  let query = 'SELECT id FROM users WHERE email = $1';
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const getUserByPhone = async (phone, excludeId = null) => {
  const params = [phone];
  let query = 'SELECT id FROM users WHERE phone = $1';
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const getCollectionPoint = async (collectionPointId) => {
  const result = await pool.query(
    'SELECT id, name, division, status FROM collection_points WHERE id = $1 LIMIT 1',
    [collectionPointId]
  );
  return result.rows[0] || null;
};

const assertNoActiveAgentOnPoint = async (collectionPointId, excludeUserId = null) => {
  const params = [collectionPointId];
  let query = `
    SELECT id FROM users
    WHERE role = 'AGENT' AND status = 'ACTIVE' AND collection_point_id = $1
  `;
  if (excludeUserId) {
    params.push(excludeUserId);
    query += ' AND id != $2';
  }
  const result = await pool.query(`${query} LIMIT 1`, params);
  if (result.rows.length > 0) {
    throw Object.assign(new Error('This collection point already has an assigned agent'), { status: 400 });
  }
};

const syncCollectionPointAgent = async (collectionPointId, agentName, agentPhone) => {
  if (!collectionPointId) return;
  await pool.query(
    `UPDATE collection_points
     SET agent_name = $1, agent_phone = $2, updated_at = NOW()
     WHERE id = $3`,
    [agentName || null, agentPhone || null, collectionPointId]
  );
};

const clearCollectionPointAgent = async (collectionPointId) => {
  if (!collectionPointId) return;
  await pool.query(
    `UPDATE collection_points
     SET agent_name = NULL, agent_phone = NULL, updated_at = NOW()
     WHERE id = $1`,
    [collectionPointId]
  );
};

const handleAgentCollectionPointLink = async ({
  role,
  collectionPointId,
  agentName,
  agentPhone,
  previousCollectionPointId,
}) => {
  if (previousCollectionPointId && previousCollectionPointId !== collectionPointId) {
    await clearCollectionPointAgent(previousCollectionPointId);
  }

  if (role === 'AGENT' && collectionPointId) {
    await syncCollectionPointAgent(collectionPointId, agentName, agentPhone);
    return;
  }

  if (previousCollectionPointId && role !== 'AGENT') {
    await clearCollectionPointAgent(previousCollectionPointId);
  }
};

const getPicker = async (pickerId) => {
  const result = await pool.query(
    'SELECT id, picker_code, name, phone, status FROM pickers WHERE id = $1 LIMIT 1',
    [pickerId]
  );
  return result.rows[0] || null;
};

const getActiveSuperAdminCount = async () => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'"
  );
  return Number(result.rows[0]?.count || 0);
};

const canAccessUsersIndex = (actorRole) => ['SUPER_ADMIN', 'CITY_ADMIN'].includes(actorRole);

const buildUsersIndexQuery = (actorUser, filters) => {
  const actorRole = getActorRole(actorUser);
  const actorCity = getActorCity(actorUser);
  const params = [];
  const clauses = [];

  if (!canAccessUsersIndex(actorRole)) {
    return { error: 'Forbidden' };
  }

  if (actorRole === 'CITY_ADMIN') {
    const requestedRole = filters.role ? normalizeUserRole(filters.role) : null;

    if (requestedRole && !['AGENT', 'PICKER'].includes(requestedRole)) {
      return { error: 'Forbidden' };
    }

    clauses.push("u.role IN ('AGENT', 'PICKER')");

    if (requestedRole) {
      params.push(requestedRole);
      clauses.push(`u.role = $${params.length}`);
    }

    if (actorCity) {
      params.push(actorCity);
      clauses.push(`(u.city = $${params.length} OR u.city IS NULL)`);
    }
  } else if (filters.role) {
    params.push(normalizeUserRole(filters.role));
    clauses.push(`u.role = $${params.length}`);
  }

  if (filters.status) {
    params.push(normalizeUserStatus(filters.status));
    clauses.push(`u.status = $${params.length}`);
  }

  if (filters.city) {
    const requestedCity = String(filters.city).trim();
    if (actorRole === 'CITY_ADMIN' && actorCity && requestedCity !== actorCity) {
      return { error: 'Forbidden' };
    }

    params.push(requestedCity);
    clauses.push(`u.city = $${params.length}`);
  }

  if (filters.collection_point_id) {
    params.push(filters.collection_point_id);
    clauses.push(`u.collection_point_id = $${params.length}`);
  }

  return {
    params,
    query: `${userSelectQuery}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY u.created_at DESC`,
  };
};

const ensureActorCanManageTarget = ({ actorUser, targetUser }) => {
  if (!canManageUser(actorUser, targetUser)) {
    return 'Forbidden';
  }

  return null;
};

const ensureNotLastActiveSuperAdmin = async (targetUser, nextStatus = targetUser.status, nextRole = targetUser.role) => {
  const currentRole = normalizeUserRole(targetUser?.role);
  const nextNormalizedRole = normalizeUserRole(nextRole);
  const nextNormalizedStatus = normalizeUserStatus(nextStatus);

  if (currentRole !== 'SUPER_ADMIN') {
    return null;
  }

  const activeSuperAdminCount = await getActiveSuperAdminCount();
  const removingSuperAdminAccess = nextNormalizedRole !== 'SUPER_ADMIN' || nextNormalizedStatus !== 'ACTIVE';

  if (activeSuperAdminCount <= 1 && removingSuperAdminAccess && normalizeUserStatus(targetUser.status) === 'ACTIVE') {
    return 'Cannot deactivate or demote the last active SUPER_ADMIN';
  }

  return null;
};

export const createUser = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const actorRole = getActorRole(req.user);
    const actorCity = getActorCity(req.user);
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
      return sendError(res, 'name, role, and password are required', 400);
    }

    if (!email && !phone) {
      return sendError(res, 'Either email or phone is required', 400);
    }

    const normalizedRole = normalizeUserRole(role);
    if (!ALLOWED_USER_ROLES.includes(normalizedRole)) {
      return sendError(res, 'Unsupported user role', 400);
    }

    if (!canCreateRole(actorRole, normalizedRole)) {
      return sendError(res, 'Forbidden', 403);
    }

    const normalizedStatus = normalizeUserStatus(status);
    if (!ALLOWED_USER_STATUSES.includes(normalizedStatus)) {
      return sendError(res, 'Unsupported user status', 400);
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const normalizedPhone = phone ? String(phone).trim() : null;
    const normalizedCity = normalizedRole === 'CITY_ADMIN'
      ? String(city || '').trim()
      : (actorRole === 'CITY_ADMIN' ? actorCity : (city ? String(city).trim() : null));

    if (normalizedEmail) {
      const duplicateEmail = await getUserByEmail(normalizedEmail);
      if (duplicateEmail) {
        return sendError(res, 'Email already exists', 400);
      }
    }

    if (normalizedPhone) {
      const duplicatePhone = await getUserByPhone(normalizedPhone);
      if (duplicatePhone) {
        return sendError(res, 'Phone already exists', 400);
      }
    }

    if (normalizedRole === 'CITY_ADMIN' && !normalizedCity) {
      return sendError(res, 'CITY_ADMIN users must have a city', 400);
    }

    if (normalizedRole === 'AGENT') {
      if (!collection_point_id) {
        return sendError(res, 'AGENT users must be assigned to a collection point', 400);
      }

      const collectionPoint = await getCollectionPoint(collection_point_id);
      if (!collectionPoint) {
        return sendError(res, 'Collection point not found', 404);
      }

      try {
        await assertNoActiveAgentOnPoint(collection_point_id);
      } catch (error) {
        return sendError(res, error.message, error.status || 400);
      }
    }

    if (normalizedRole === 'PICKER') {
      if (!picker_id) {
        return sendError(res, 'PICKER users must be linked to a picker profile (picker_id is required)', 400);
      }

      if (!normalizedPhone) {
        return sendError(res, 'PICKER users must provide a phone number', 400);
      }

      const picker = await getPicker(picker_id);
      if (!picker) {
        return sendError(res, 'Picker not found', 404);
      }

      if (picker.phone && String(picker.phone).trim() !== normalizedPhone) {
        return sendError(res, 'Provided phone does not match picker profile', 400);
      }
    }

    const roleRuleError = validateUserRoleRules({
      role: normalizedRole,
      city: normalizedCity,
      collection_point_id,
      picker_id,
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
        normalizedCity,
        division ? String(division).trim() : null,
        collection_point_id || null,
        picker_id || null,
        normalizedStatus,
      ]
    );

    const createdUser = result.rows[0];

    if (normalizedRole === 'AGENT') {
      await syncCollectionPointAgent(
        collection_point_id,
        String(name).trim(),
        normalizedPhone
      );
    }

    return sendSuccess(res, 'User created successfully', safeUserFromRow(createdUser), 201);
  } catch (error) {
    console.error('[Create User Error]', { code: error.code, message: error.message });
    if (error.status) {
      return sendError(res, error.message, error.status);
    }
    return sendError(res, 'Failed to create user', 500);
  }
};

export const getUsers = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const scope = buildUsersIndexQuery(req.user, req.query);
    if (scope.error) {
      return sendError(res, scope.error, 403);
    }

    const result = await pool.query(scope.query, scope.params);
    return sendSuccess(res, 'Users retrieved successfully', result.rows.map(safeUserFromRow));
  } catch (error) {
    console.error('[Get Users Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to fetch users', 500);
  }
};

export const getUserById = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const actorRole = getActorRole(req.user);
    if (!canAccessUsersIndex(actorRole)) {
      return sendError(res, 'Forbidden', 403);
    }

    const { id } = req.params;
    const result = await pool.query(`${userSelectQuery} WHERE u.id = $1 LIMIT 1`, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const targetUser = safeUserFromRow(result.rows[0]);
    const forbidden = ensureActorCanManageTarget({ actorUser: req.user, targetUser });
    if (forbidden) {
      return sendError(res, forbidden, 403);
    }

    return sendSuccess(res, 'User retrieved successfully', targetUser);
  } catch (error) {
    console.error('[Get User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to fetch user', 500);
  }
};

export const updateUser = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const actorRole = getActorRole(req.user);
    const { id } = req.params;
    const existingResult = await pool.query(
      'SELECT id, role, city, collection_point_id, picker_id, status FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const existingUser = existingResult.rows[0];
    const existingSafeUser = safeUserFromRow(existingResult.rows[0]);
    const forbidden = ensureActorCanManageTarget({ actorUser: req.user, targetUser: existingSafeUser });
    if (forbidden) {
      return sendError(res, forbidden, 403);
    }

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

      if (actorRole === 'CITY_ADMIN' && !['AGENT', 'PICKER'].includes(normalizedRole)) {
        return sendError(res, 'Forbidden', 403);
      }

      if (actorRole === 'SUPER_ADMIN' && normalizedRole === 'SUPER_ADMIN' && existingUser.role !== 'SUPER_ADMIN') {
        return sendError(res, 'Forbidden', 403);
      }

      if (actorRole === 'CITY_ADMIN' && normalizedRole === 'SUPER_ADMIN') {
        return sendError(res, 'Forbidden', 403);
      }

      updates.push(`role = $${index++}`);
      values.push(normalizedRole);
    }

    const normalizedCity = city !== undefined ? (city ? String(city).trim() : null) : existingUser.city;

    if (city !== undefined) {
      if (actorRole === 'CITY_ADMIN' && normalizedCity && getActorCity(req.user) && normalizedCity !== getActorCity(req.user)) {
        return sendError(res, 'Forbidden', 403);
      }

      updates.push(`city = $${index++}`);
      values.push(normalizedCity);
    }

    if (division !== undefined) {
      updates.push(`division = $${index++}`);
      values.push(division ? String(division).trim() : null);
    }

    const finalCollectionPointId = collection_point_id !== undefined ? collection_point_id || null : existingUser.collection_point_id;
    const finalPickerId = picker_id !== undefined ? picker_id || null : existingUser.picker_id;

    if (collection_point_id !== undefined) {
      if (collection_point_id) {
        const collectionPoint = await getCollectionPoint(collection_point_id);
        if (!collectionPoint) {
          return sendError(res, 'Collection point not found', 404);
        }
      }
      updates.push(`collection_point_id = $${index++}`);
      values.push(finalCollectionPointId);
    }

    if (picker_id !== undefined) {
      if (picker_id) {
        const picker = await getPicker(picker_id);
        if (!picker) {
          return sendError(res, 'Picker not found', 404);
        }
      }
      updates.push(`picker_id = $${index++}`);
      values.push(finalPickerId);
    }

    if (status !== undefined) {
      const normalizedStatus = normalizeUserStatus(status);
      if (!ALLOWED_USER_STATUSES.includes(normalizedStatus)) {
        return sendError(res, 'Unsupported user status', 400);
      }

      if (actorRole === 'CITY_ADMIN' && ['SUPER_ADMIN', 'CITY_ADMIN'].includes(normalizeUserRole(existingUser.role))) {
        return sendError(res, 'Forbidden', 403);
      }

      const superAdminSafetyError = await ensureNotLastActiveSuperAdmin(existingSafeUser, normalizedStatus, normalizedRole);
      if (superAdminSafetyError) {
        return sendError(res, superAdminSafetyError, 403);
      }

      updates.push(`status = $${index++}`);
      values.push(normalizedStatus);
    } else {
      const superAdminSafetyError = await ensureNotLastActiveSuperAdmin(existingSafeUser, existingUser.status, normalizedRole);
      if (superAdminSafetyError) {
        return sendError(res, superAdminSafetyError, 403);
      }
    }

    if (normalizedRole === 'SUPER_ADMIN' && existingUser.role !== 'SUPER_ADMIN') {
      return sendError(res, 'Forbidden', 403);
    }

    if (normalizedRole === 'CITY_ADMIN' && !normalizedCity) {
      return sendError(res, 'CITY_ADMIN users must have a city', 400);
    }

    if (normalizedRole === 'AGENT' && !finalCollectionPointId) {
      return sendError(res, 'AGENT users must be assigned to a collection point', 400);
    }

    if (normalizedRole === 'AGENT' && finalCollectionPointId) {
      try {
        await assertNoActiveAgentOnPoint(finalCollectionPointId, id);
      } catch (error) {
        return sendError(res, error.message, error.status || 400);
      }
    }

    if (normalizedRole === 'PICKER' && !finalPickerId) {
      return sendError(res, 'PICKER users must be linked to a picker profile', 400);
    }

    const roleRuleError = validateUserRoleRules({
      role: normalizedRole,
      city: normalizedCity,
      collection_point_id: finalCollectionPointId,
      picker_id: finalPickerId,
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

    const updatedUser = result.rows[0];
    await handleAgentCollectionPointLink({
      role: updatedUser.role,
      collectionPointId: updatedUser.collection_point_id,
      agentName: updatedUser.name,
      agentPhone: updatedUser.phone,
      previousCollectionPointId: existingUser.collection_point_id,
    });

    return sendSuccess(res, 'User updated successfully', safeUserFromRow(updatedUser));
  } catch (error) {
    console.error('[Update User Error]', { code: error.code, message: error.message });
    if (error.status) {
      return sendError(res, error.message, error.status);
    }
    return sendError(res, 'Failed to update user', 500);
  }
};

export const deactivateUser = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const { id } = req.params;
    const existingResult = await pool.query(
      'SELECT id, role, city, collection_point_id, picker_id, status FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const targetUser = safeUserFromRow(existingResult.rows[0]);
    const forbidden = ensureActorCanManageTarget({ actorUser: req.user, targetUser });
    if (forbidden) {
      return sendError(res, forbidden, 403);
    }

    const superAdminSafetyError = await ensureNotLastActiveSuperAdmin(targetUser, 'INACTIVE', targetUser.role);
    if (superAdminSafetyError) {
      return sendError(res, superAdminSafetyError, 403);
    }

    const result = await pool.query(
      `UPDATE users SET status = 'INACTIVE', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, phone, role, city, division, collection_point_id, picker_id, status, created_at, updated_at`,
      [id]
    );

    const deactivatedUser = result.rows[0];
    if (normalizeUserRole(deactivatedUser.role) === 'AGENT') {
      await clearCollectionPointAgent(deactivatedUser.collection_point_id);
    }

    return sendSuccess(res, 'User deactivated successfully', safeUserFromRow(deactivatedUser));
  } catch (error) {
    console.error('[Deactivate User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to deactivate user', 500);
  }
};

export const activateUser = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const { id } = req.params;
    const existingResult = await pool.query(
      'SELECT id, role, city, collection_point_id, picker_id, status FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const targetUser = safeUserFromRow(existingResult.rows[0]);
    const forbidden = ensureActorCanManageTarget({ actorUser: req.user, targetUser });
    if (forbidden) {
      return sendError(res, forbidden, 403);
    }

    const result = await pool.query(
      `UPDATE users SET status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, phone, role, city, division, collection_point_id, picker_id, status, created_at, updated_at`,
      [id]
    );

    const activatedUser = result.rows[0];
    if (normalizeUserRole(activatedUser.role) === 'AGENT' && activatedUser.collection_point_id) {
      try {
        await assertNoActiveAgentOnPoint(activatedUser.collection_point_id, activatedUser.id);
        await syncCollectionPointAgent(
          activatedUser.collection_point_id,
          activatedUser.name,
          activatedUser.phone
        );
      } catch (error) {
        return sendError(res, error.message, error.status || 400);
      }
    }

    return sendSuccess(res, 'User activated successfully', safeUserFromRow(activatedUser));
  } catch (error) {
    console.error('[Activate User Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to activate user', 500);
  }
};

export const resetPassword = async (req, res) => {
  try {
    await ensureUsersTableSchema();

    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return sendError(res, 'Password is required', 400);
    }

    const existingResult = await pool.query(
      'SELECT id, role, city, collection_point_id, picker_id, status FROM users WHERE id = $1 LIMIT 1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const targetUser = safeUserFromRow(existingResult.rows[0]);
    if (!canResetPassword(req.user, targetUser)) {
      return sendError(res, 'Forbidden', 403);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id, passwordHash]
    );

    return sendSuccess(res, 'Password reset successfully', { success: true });
  } catch (error) {
    console.error('[Reset Password Error]', { code: error.code, message: error.message });
    return sendError(res, 'Failed to reset password', 500);
  }
};
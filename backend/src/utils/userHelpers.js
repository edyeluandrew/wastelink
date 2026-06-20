import pool from "../config/db.js";

export const ALLOWED_USER_ROLES = ["SUPER_ADMIN", "CITY_ADMIN", "AGENT", "PICKER", "RECYCLER"];
export const ALLOWED_USER_STATUSES = ["ACTIVE", "INACTIVE"];

export const normalizeUserRole = (role) => {
  if (!role) return null;
  return String(role).trim().toUpperCase();
};

export const normalizeUserStatus = (status) => {
  if (!status) return "ACTIVE";
  return String(status).trim().toUpperCase();
};

export const canCreateRole = (actorRole, targetRole) => {
  const normalizedActorRole = normalizeUserRole(actorRole);
  const normalizedTargetRole = normalizeUserRole(targetRole);

  if (normalizedActorRole === 'SUPER_ADMIN') {
    return ['CITY_ADMIN', 'AGENT', 'PICKER', 'RECYCLER'].includes(normalizedTargetRole);
  }

  if (normalizedActorRole === 'CITY_ADMIN') {
    return ['AGENT', 'PICKER', 'RECYCLER'].includes(normalizedTargetRole);
  }

  return false;
};

export const canManageUser = (actorUser, targetUser) => {
  const actorRole = normalizeUserRole(actorUser?.role);
  const targetRole = normalizeUserRole(targetUser?.role);

  if (!actorRole || !targetRole) {
    return false;
  }

  if (actorRole === 'SUPER_ADMIN') {
    return true;
  }

  if (actorRole === 'CITY_ADMIN') {
    if (!['AGENT', 'PICKER'].includes(targetRole)) {
      return false;
    }

    const actorCity = actorUser?.city ? String(actorUser.city).trim() : null;
    const targetCity = targetUser?.city ? String(targetUser.city).trim() : null;

    if (actorCity && targetCity && actorCity !== targetCity) {
      return false;
    }

    return true;
  }

  return false;
};

export const canResetPassword = (actorUser, targetUser) => canManageUser(actorUser, targetUser);

export const safeUserFromRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  city: row.city,
  division: row.division,
  collection_point_id: row.collection_point_id,
  collection_point_name: row.collection_point_name || null,
  collection_point: row.collection_point_id
    ? {
        id: row.collection_point_id,
        point_code: row.collection_point_point_code || null,
        name: row.collection_point_name || null,
        division: row.collection_point_division || row.division || null,
        agent_name: row.collection_point_agent_name || null,
        agent_phone: row.collection_point_agent_phone || null,
        status: row.collection_point_status || null,
      }
    : null,
  picker_id: row.picker_id,
  picker_name: row.picker_name || null,
  recycler_id: row.recycler_id,
  recycler: row.recycler_id
    ? {
        id: row.recycler_id,
        company_name: row.recycler_company_name || null,
        contact_person: row.recycler_contact_person || null,
        phone: row.recycler_phone || null,
        status: row.recycler_status || null,
      }
    : null,
  picker: row.picker_id
    ? {
        id: row.picker_id,
        picker_code: row.picker_code || null,
        name: row.picker_name || null,
        phone: row.picker_phone || null,
        gender: row.picker_gender || null,
        age_group: row.picker_age_group || null,
        division: row.picker_division || null,
        main_waste_type: row.picker_main_waste_type || null,
        status: row.picker_status || null,
      }
    : null,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const ensureUsersTableSchema = async () => {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS division VARCHAR(100),
      ADD COLUMN IF NOT EXISTS collection_point_id INT,
      ADD COLUMN IF NOT EXISTS picker_id INT,
      ADD COLUMN IF NOT EXISTS recycler_id INT
  `);

  const constraintResult = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users' AND c.contype = 'c'
  `);

  const existingConstraint = constraintResult.rows.find((row) => row.definition.includes('role'));
  const hasAllowedRoles = existingConstraint?.definition.includes("'SUPER_ADMIN'")
    && existingConstraint?.definition.includes("'CITY_ADMIN'")
    && existingConstraint?.definition.includes("'AGENT'")
    && existingConstraint?.definition.includes("'PICKER'")
    && existingConstraint?.definition.includes("'RECYCLER'")
    && !existingConstraint.definition.includes("'ADMIN'")
    && !existingConstraint.definition.includes('MUNICIPAL_OFFICER');

  if (existingConstraint && hasAllowedRoles) {
    return;
  }

  if (existingConstraint) {
    await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${existingConstraint.conname}`);
  }

  await pool.query(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('SUPER_ADMIN', 'CITY_ADMIN', 'AGENT', 'PICKER', 'RECYCLER'))
    NOT VALID
  `).catch(() => {
    // Best effort only; application validation remains the source of truth for now.
  });
};

export const validateUserRoleRules = ({ role, city, collection_point_id, picker_id, recycler_id }) => {
  if (role === 'AGENT' && !collection_point_id) {
    return 'AGENT users must be assigned to a collection point';
  }

  if (role === 'CITY_ADMIN' && !city) {
    return 'CITY_ADMIN users must have a city';
  }

  if (role === 'PICKER' && !picker_id) {
    return 'PICKER users must be linked to a picker profile';
  }

  if (role === 'RECYCLER' && !recycler_id) {
    return 'RECYCLER users must be linked to a recycler profile';
  }

  return null;
};

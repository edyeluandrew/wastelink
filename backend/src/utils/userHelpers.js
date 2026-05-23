import pool from "../config/db.js";

export const ALLOWED_USER_ROLES = ["SUPER_ADMIN", "CITY_ADMIN", "AGENT", "PICKER"];
export const ALLOWED_USER_STATUSES = ["ACTIVE", "INACTIVE"];

export const normalizeUserRole = (role) => {
  if (!role) return null;
  return String(role).trim().toUpperCase();
};

export const normalizeUserStatus = (status) => {
  if (!status) return "ACTIVE";
  return String(status).trim().toUpperCase();
};

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
  picker_id: row.picker_id,
  picker_name: row.picker_name || null,
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
      ADD COLUMN IF NOT EXISTS picker_id INT
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
    CHECK (role IN ('SUPER_ADMIN', 'CITY_ADMIN', 'AGENT', 'PICKER'))
    NOT VALID
  `).catch(() => {
    // Best effort only; application validation remains the source of truth for now.
  });
};

export const validateUserRoleRules = ({ role, city, collection_point_id }) => {
  if (role === 'AGENT' && !collection_point_id) {
    return 'AGENT users must be assigned to a collection point';
  }

  if (role === 'CITY_ADMIN' && !city) {
    return 'CITY_ADMIN users must have a city';
  }

  return null;
};

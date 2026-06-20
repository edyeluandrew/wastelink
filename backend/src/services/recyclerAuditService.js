import pool from '../config/db.js';

export const logRecyclerAudit = async ({ action, entityType, entityId, adminId, details = {} }) => {
  await pool.query(
    `INSERT INTO recycler_audit_logs (action, entity_type, entity_id, admin_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [action, entityType, entityId ?? null, adminId ?? null, JSON.stringify(details)]
  );
};

export default { logRecyclerAudit };

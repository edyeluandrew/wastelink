import pool from '../config/db.js';
import { generateBatchCode } from '../utils/generateCodes.js';
import { logRecyclerAudit } from './recyclerAuditService.js';
import { isBatchAvailableForPurchase } from '../utils/recyclerStatuses.js';

const roundMoney = (kg, pricePerKg) => Math.round(Number(kg) * Number(pricePerKg));

export const sanitizeBatchForRecycler = (row) => ({
  id: row.id,
  batch_code: row.batch_code,
  waste_type: row.waste_type,
  city: row.city,
  collection_point_id: row.collection_point_id,
  collection_point_name: row.collection_point_name,
  collection_point_division: row.collection_point_division,
  verified_kg: Number(row.verified_kg),
  available_kg: Number(row.available_kg),
  recycler_sale_price_per_kg: Number(row.recycler_sale_price_per_kg),
  expected_total_amount: row.expected_total_amount,
  gross_margin_per_kg: Number(row.recycler_sale_price_per_kg) - Number(row.picker_price_per_kg_snapshot || 0),
  status: row.status,
  quality_notes: row.quality_notes,
  pickup_instructions: row.pickup_instructions,
  pickup_date: row.pickup_date,
  created_at: row.created_at,
});

const batchSelect = `
  SELECT b.*,
    cp.name AS collection_point_name,
    cp.division AS collection_point_division
  FROM waste_sale_batches b
  JOIN collection_points cp ON cp.id = b.collection_point_id
`;

export const listAvailableBatches = async ({ city } = {}) => {
  const params = [];
  let where = `b.status = 'AVAILABLE' AND b.available_kg > 0`;

  if (city) {
    params.push(city);
    where += ` AND b.city = $${params.length}`;
  }

  const result = await pool.query(
    `${batchSelect} WHERE ${where} ORDER BY b.created_at DESC`,
    params
  );
  return result.rows.map(sanitizeBatchForRecycler);
};

export const getBatchById = async (batchId, { forRecycler = false } = {}) => {
  const result = await pool.query(`${batchSelect} WHERE b.id = $1`, [batchId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return forRecycler ? sanitizeBatchForRecycler(row) : row;
};

export const listAdminBatches = async ({ status, city } = {}) => {
  const params = [];
  const clauses = [];

  if (status) {
    params.push(status);
    clauses.push(`b.status = $${params.length}`);
  }
  if (city) {
    params.push(city);
    clauses.push(`b.city = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `${batchSelect} ${where} ORDER BY b.created_at DESC`,
    params
  );
  return result.rows;
};

const unbatchedVerifiedClause = `
  wl.status = 'VERIFIED'
  AND NOT EXISTS (SELECT 1 FROM waste_batch_items wbi WHERE wbi.waste_log_id = wl.id)
`;

export const getVerifiedInventorySummary = async ({ city } = {}) => {
  const verified = await pool.query(
    `SELECT wl.waste_type,
            COALESCE(SUM(wl.verified_kg), 0) AS verified_kg
     FROM waste_logs wl
     JOIN collection_points cp ON cp.id = wl.collection_point_id
     WHERE ${unbatchedVerifiedClause}
     GROUP BY wl.waste_type
     ORDER BY wl.waste_type`
  );

  return verified.rows;
};

export const listVerifiedWasteLogs = async ({ collection_point_id, waste_type } = {}) => {
  const params = [];
  const clauses = [unbatchedVerifiedClause];

  if (collection_point_id) {
    params.push(Number(collection_point_id));
    clauses.push(`wl.collection_point_id = $${params.length}`);
  }
  if (waste_type) {
    params.push(waste_type);
    clauses.push(`wl.waste_type = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT wl.id, wl.job_code, wl.waste_type, wl.verified_kg, wl.verified_at,
            wl.price_per_kg_snapshot, wl.city_waste_type_id,
            cp.id AS collection_point_id, cp.name AS collection_point_name, cp.division
     FROM waste_logs wl
     JOIN collection_points cp ON cp.id = wl.collection_point_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY wl.verified_at DESC`,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    job_code: row.job_code,
    waste_type: row.waste_type,
    verified_kg: Number(row.verified_kg),
    verified_at: row.verified_at,
    picker_price_per_kg: Number(row.price_per_kg_snapshot || 0),
    city_waste_type_id: row.city_waste_type_id,
    collection_point_id: row.collection_point_id,
    collection_point_name: row.collection_point_name,
    division: row.division,
  }));
};

export const createSaleBatch = async (payload, adminId) => {
  const {
    waste_type,
    city_waste_type_id,
    city = 'kampala',
    collection_point_id,
    verified_kg,
    recycler_sale_price_per_kg,
    picker_price_per_kg_snapshot,
    quality_notes,
    pickup_instructions,
    admin_notes,
    price_override_reason,
    waste_log_ids = [],
  } = payload;

  const kg = Number(verified_kg);
  const salePrice = Number(recycler_sale_price_per_kg);
  const pickerPrice = Number(picker_price_per_kg_snapshot || 0);

  if (!waste_type || !collection_point_id || !(kg > 0) || !(salePrice >= 0)) {
    throw new Error('Invalid batch fields');
  }

  if (salePrice < pickerPrice && !price_override_reason) {
    throw new Error('Recycler sale price must be >= picker price or provide override reason');
  }

  const batchCode = generateBatchCode();
  const expectedTotal = roundMoney(kg, salePrice);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insert = await client.query(
      `INSERT INTO waste_sale_batches (
        batch_code, waste_type, city_waste_type_id, city, collection_point_id,
        verified_kg, available_kg, picker_price_per_kg_snapshot,
        recycler_sale_price_per_kg, expected_total_amount, status,
        created_by_admin_id, quality_notes, pickup_instructions, admin_notes,
        price_override_reason
      ) VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,'AVAILABLE',$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        batchCode,
        waste_type,
        city_waste_type_id || null,
        city,
        collection_point_id,
        kg,
        pickerPrice,
        salePrice,
        expectedTotal,
        adminId,
        quality_notes || null,
        pickup_instructions || null,
        admin_notes || null,
        price_override_reason || null,
      ]
    );

    const batch = insert.rows[0];

    if (Array.isArray(waste_log_ids) && waste_log_ids.length > 0) {
      for (const logId of waste_log_ids) {
        const logResult = await client.query(
          `SELECT id, verified_kg FROM waste_logs WHERE id = $1 AND status = 'VERIFIED'`,
          [logId]
        );
        if (logResult.rows.length === 0) continue;
        await client.query(
          `INSERT INTO waste_batch_items (batch_id, waste_log_id, kg_allocated)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [batch.id, logId, logResult.rows[0].verified_kg]
        );
      }
    }

    await logRecyclerAudit({
      action: 'CREATE_BATCH',
      entityType: 'waste_sale_batch',
      entityId: batch.id,
      adminId,
      details: { batch_code: batchCode, verified_kg: kg },
    });

    await client.query('COMMIT');
    return batch;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateSaleBatch = async (batchId, payload, adminId) => {
  const existing = await getBatchById(batchId);
  if (!existing) throw new Error('Batch not found');
  if (existing.status === 'SOLD') throw new Error('Sold batches cannot be edited');

  const fields = [];
  const values = [];
  const allowed = [
    'recycler_sale_price_per_kg',
    'quality_notes',
    'pickup_instructions',
    'admin_notes',
    'status',
    'price_override_reason',
  ];

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      values.push(payload[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (payload.recycler_sale_price_per_kg !== undefined) {
    const salePrice = Number(payload.recycler_sale_price_per_kg);
    const pickerPrice = Number(existing.picker_price_per_kg_snapshot);
    if (salePrice < pickerPrice && !payload.price_override_reason && !existing.price_override_reason) {
      throw new Error('Recycler sale price must be >= picker price or provide override reason');
    }
    values.push(roundMoney(existing.verified_kg, salePrice));
    fields.push(`expected_total_amount = $${values.length}`);
  }

  if (fields.length === 0) return existing;

  values.push(batchId);
  const result = await pool.query(
    `UPDATE waste_sale_batches SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length} RETURNING *`,
    values
  );

  await logRecyclerAudit({
    action: 'UPDATE_BATCH',
    entityType: 'waste_sale_batch',
    entityId: batchId,
    adminId,
    details: payload,
  });

  return result.rows[0];
};

export default {
  listAvailableBatches,
  getBatchById,
  listAdminBatches,
  getVerifiedInventorySummary,
  listVerifiedWasteLogs,
  createSaleBatch,
  updateSaleBatch,
  sanitizeBatchForRecycler,
  isBatchAvailableForPurchase,
};

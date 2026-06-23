import pool from '../config/db.js';
import { normalizeCity, DEFAULT_CITY } from '../utils/cityScope.js';

export const getRecyclerAccessContext = async (recyclerId) => {
  const recyclerResult = await pool.query(`SELECT * FROM recyclers WHERE id = $1`, [recyclerId]);
  const recycler = recyclerResult.rows[0];
  if (!recycler) return null;

  const accepted = await pool.query(
    `SELECT raw.id, raw.city_waste_type_id, raw.waste_type_name, cwt.name AS city_waste_type_name
     FROM recycler_accepted_waste_types raw
     LEFT JOIN city_waste_types cwt ON cwt.id = raw.city_waste_type_id
     WHERE raw.recycler_id = $1`,
    [recyclerId]
  );

  const acceptedTypeIds = accepted.rows.map((r) => r.city_waste_type_id).filter(Boolean);
  const acceptedNames = accepted.rows
    .map((r) => (r.city_waste_type_name || r.waste_type_name || '').trim().toLowerCase())
    .filter(Boolean);

  return {
    recycler,
    approvedCity: normalizeCity(recycler.city),
    acceptedTypeIds,
    acceptedNames,
  };
};

const batchTypeResolutionJoin = `
  LEFT JOIN city_waste_types cwt_batch ON cwt_batch.id = b.city_waste_type_id
  LEFT JOIN city_waste_types cwt_by_name ON b.city_waste_type_id IS NULL
    AND LOWER(cwt_by_name.city) = LOWER(b.city)
    AND (
      LOWER(cwt_by_name.name) = LOWER(b.waste_type)
      OR LOWER(cwt_by_name.slug) = LOWER(b.waste_type)
    )
`;

const resolvedBatchTypeIdSql = 'COALESCE(b.city_waste_type_id, cwt_by_name.id)';
const resolvedBatchTypeNameSql = 'LOWER(COALESCE(cwt_batch.name, cwt_by_name.name, b.waste_type))';
const resolvedBatchTypeSlugSql = 'LOWER(COALESCE(cwt_batch.slug, cwt_by_name.slug, \'\'))';

export const resolveBatchCityWasteType = async (batch) => {
  if (batch.city_waste_type_id) {
    const result = await pool.query(
      `SELECT id, name, slug, city FROM city_waste_types WHERE id = $1 LIMIT 1`,
      [batch.city_waste_type_id]
    );
    return result.rows[0] || null;
  }

  if (!batch.waste_type || !batch.city) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, name, slug, city FROM city_waste_types
     WHERE LOWER(city) = LOWER($1)
       AND (LOWER(name) = LOWER($2) OR LOWER(slug) = LOWER($2))
     LIMIT 1`,
    [batch.city, batch.waste_type]
  );
  return result.rows[0] || null;
};

const buildRecyclerBatchScope = (ctx) => ({
  params: [ctx.approvedCity],
  cityParam: '$1',
  typeJoin: batchTypeResolutionJoin,
});

export const getInventorySummaryForRecycler = async (recyclerId) => {
  const ctx = await getRecyclerAccessContext(recyclerId);
  if (!ctx || ctx.recycler.status !== 'ACTIVE') {
    return { summary: [], context: ctx };
  }

  const { params, cityParam, typeJoin } = buildRecyclerBatchScope(ctx);

  const result = await pool.query(
    `SELECT
       COALESCE(${resolvedBatchTypeIdSql}::text, ${resolvedBatchTypeNameSql}) AS waste_type_key,
       ${resolvedBatchTypeIdSql} AS city_waste_type_id,
       COALESCE(cwt_batch.name, cwt_by_name.name, b.waste_type) AS waste_type_name,
       COALESCE(SUM(b.available_kg), 0)::numeric AS total_available_kg,
       COUNT(DISTINCT b.collection_point_id)::int AS collection_point_count,
       MIN(b.recycler_sale_price_per_kg)::numeric AS min_price_per_kg,
       MAX(b.recycler_sale_price_per_kg)::numeric AS max_price_per_kg
     FROM waste_sale_batches b
     ${typeJoin}
     WHERE b.status = 'AVAILABLE'
       AND b.available_kg > 0
       AND LOWER(b.city) = LOWER(${cityParam})
     GROUP BY ${resolvedBatchTypeIdSql}, COALESCE(cwt_batch.name, cwt_by_name.name, b.waste_type)
     ORDER BY waste_type_name`,
    params
  );

  return {
    summary: result.rows.map((row) => ({
      waste_type_key: row.waste_type_key,
      waste_type_id: row.city_waste_type_id,
      waste_type_name: row.waste_type_name,
      total_available_kg: Number(row.total_available_kg),
      collection_point_count: row.collection_point_count,
      min_price_per_kg: Number(row.min_price_per_kg),
      max_price_per_kg: Number(row.max_price_per_kg),
    })),
    context: ctx,
  };
};

export const getCollectionPointsForWasteType = async (recyclerId, wasteTypeKey) => {
  const ctx = await getRecyclerAccessContext(recyclerId);
  if (!ctx || ctx.recycler.status !== 'ACTIVE') return [];

  const { params, cityParam, typeJoin } = buildRecyclerBatchScope(ctx);

  let wasteFilter = '';
  if (/^\d+$/.test(String(wasteTypeKey))) {
    params.push(Number(wasteTypeKey));
    wasteFilter = `AND ${resolvedBatchTypeIdSql} = $${params.length}`;
  } else {
    params.push(String(wasteTypeKey).toLowerCase());
    wasteFilter = `AND (
      ${resolvedBatchTypeNameSql} = $${params.length}
      OR ${resolvedBatchTypeSlugSql} = $${params.length}
      OR LOWER(b.waste_type) = $${params.length}
    )`;
  }

  const result = await pool.query(
    `SELECT b.id, b.batch_code, b.waste_type, ${resolvedBatchTypeIdSql} AS city_waste_type_id, b.city,
            b.collection_point_id, b.available_kg, b.reserved_kg,
            b.recycler_sale_price_per_kg, b.expected_total_amount, b.status,
            b.quality_notes, b.pickup_instructions, b.updated_at,
            cp.name AS collection_point_name, cp.division AS collection_point_division
     FROM waste_sale_batches b
     JOIN collection_points cp ON cp.id = b.collection_point_id
     ${typeJoin}
     WHERE b.status = 'AVAILABLE'
       AND b.available_kg > 0
       AND LOWER(b.city) = LOWER(${cityParam})
       ${wasteFilter}
     ORDER BY cp.name, b.updated_at DESC`,
    params
  );

  return result.rows.map((row) => ({
    batch_id: row.id,
    batch_code: row.batch_code,
    waste_type: row.waste_type,
    waste_type_id: row.city_waste_type_id,
    city: row.city,
    collection_point_id: row.collection_point_id,
    collection_point_name: row.collection_point_name,
    division: row.collection_point_division,
    available_kg: Number(row.available_kg),
    reserved_kg: Number(row.reserved_kg || 0),
    recycler_sale_price_per_kg: Number(row.recycler_sale_price_per_kg),
    expected_total_amount: Math.round(Number(row.available_kg) * Number(row.recycler_sale_price_per_kg)),
    quality_notes: row.quality_notes,
    pickup_instructions: row.pickup_instructions,
    updated_at: row.updated_at,
  }));
};

export const syncRecyclerAcceptedWasteTypes = async (client, recyclerId, { waste_types_accepted, accepted_waste_type_ids = [] }) => {
  await client.query(`DELETE FROM recycler_accepted_waste_types WHERE recycler_id = $1`, [recyclerId]);

  const recycler = await client.query(`SELECT city FROM recyclers WHERE id = $1`, [recyclerId]);
  const city = recycler.rows[0]?.city || DEFAULT_CITY;

  const ids = new Set((accepted_waste_type_ids || []).map(Number).filter(Boolean));

  if (waste_types_accepted) {
    const parts = String(waste_types_accepted).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const match = await client.query(
        `SELECT id, name FROM city_waste_types
         WHERE LOWER(city) = LOWER($1)
           AND (
             LOWER(name) = LOWER($2)
             OR LOWER(slug) = LOWER($2)
             OR LOWER(name) LIKE LOWER($2) || '%'
             OR LOWER(slug) LIKE LOWER($2) || '%'
           )
         ORDER BY CASE
           WHEN LOWER(name) = LOWER($2) OR LOWER(slug) = LOWER($2) THEN 0
           ELSE 1
         END
         LIMIT 1`,
        [city, part]
      );
      if (match.rows[0]?.id) ids.add(match.rows[0].id);
      else {
        await client.query(
          `INSERT INTO recycler_accepted_waste_types (recycler_id, waste_type_name) VALUES ($1, $2)`,
          [recyclerId, part]
        );
      }
    }
  }

  for (const typeId of ids) {
    await client.query(
      `INSERT INTO recycler_accepted_waste_types (recycler_id, city_waste_type_id)
       VALUES ($1, $2) ON CONFLICT (recycler_id, city_waste_type_id) DO NOTHING`,
      [recyclerId, typeId]
    );
  }

  const labelResult = await client.query(
    `SELECT COALESCE(cwt.name, raw.waste_type_name) AS label
     FROM recycler_accepted_waste_types raw
     LEFT JOIN city_waste_types cwt ON cwt.id = raw.city_waste_type_id
     WHERE raw.recycler_id = $1
     ORDER BY label`,
    [recyclerId]
  );
  const labels = labelResult.rows.map((row) => row.label).filter(Boolean);
  if (labels.length > 0) {
    await client.query(
      `UPDATE recyclers SET waste_types_accepted = $1, updated_at = NOW() WHERE id = $2`,
      [labels.join(', '), recyclerId]
    );
  }
};

export const getDashboardMetricsForRecycler = async (recyclerId) => {
  const { summary } = await getInventorySummaryForRecycler(recyclerId);
  const totalMatchedKg = summary.reduce((s, r) => s + r.total_available_kg, 0);
  const collectionPoints = new Set();

  const batches = await pool.query(
    `SELECT DISTINCT collection_point_id FROM waste_sale_batches WHERE status = 'AVAILABLE' AND available_kg > 0`
  );
  batches.rows.forEach((r) => collectionPoints.add(r.collection_point_id));

  const requests = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM recycler_purchase_requests WHERE recycler_id = $1 GROUP BY status`,
    [recyclerId]
  );
  const purchases = await pool.query(
    `SELECT COUNT(*)::int AS completed_count,
            COALESCE(SUM(final_kg),0) AS total_kg,
            COALESCE(SUM(final_amount),0) AS total_spent
     FROM recycler_purchase_requests WHERE recycler_id = $1 AND status = 'COMPLETED'`,
    [recyclerId]
  );

  const byStatus = Object.fromEntries(requests.rows.map((r) => [r.status, r.count]));

  // Re-count collection points from matched summary
  let matchedPointCount = 0;
  if (summary.length > 0) {
    const ctx = await getRecyclerAccessContext(recyclerId);
    const { params, cityParam, typeJoin } = buildRecyclerBatchScope(ctx);
    const cpCount = await pool.query(
      `SELECT COUNT(DISTINCT b.collection_point_id)::int AS count
       FROM waste_sale_batches b
       ${typeJoin}
       WHERE b.status = 'AVAILABLE' AND b.available_kg > 0
         AND LOWER(b.city) = LOWER(${cityParam})`,
      params
    );
    matchedPointCount = cpCount.rows[0]?.count || 0;
  }

  return {
    total_matched_available_kg: totalMatchedKg,
    matched_waste_type_count: summary.length,
    matched_collection_point_count: matchedPointCount,
    pending_requests: byStatus.PENDING || 0,
    approved_requests: byStatus.APPROVED || 0,
    completed_purchases: purchases.rows[0]?.completed_count || 0,
    total_kg_purchased: Number(purchases.rows[0]?.total_kg || 0),
    total_amount_spent: Number(purchases.rows[0]?.total_spent || 0),
    summary_by_waste_type: summary,
  };
};

export default {
  getRecyclerAccessContext,
  resolveBatchCityWasteType,
  getInventorySummaryForRecycler,
  getCollectionPointsForWasteType,
  syncRecyclerAcceptedWasteTypes,
  getDashboardMetricsForRecycler,
};

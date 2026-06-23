import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import { DEFAULT_CITY } from '../utils/cityScope.js';
import { generatePurchaseRequestCode } from '../utils/generateCodes.js';
import { logRecyclerAudit } from './recyclerAuditService.js';
import { getBatchById } from './wasteSaleBatchService.js';
import { isBatchAvailableForPurchase } from '../utils/recyclerStatuses.js';
import {
  getRecyclerAccessContext,
  syncRecyclerAcceptedWasteTypes,
  getDashboardMetricsForRecycler,
} from './recyclerInventoryService.js';
import { normalizeCity } from '../utils/cityScope.js';

const roundMoney = (kg, pricePerKg) => Math.round(Number(kg) * Number(pricePerKg));

export const getRecyclerById = async (recyclerId) => {
  const result = await pool.query(`SELECT * FROM recyclers WHERE id = $1`, [recyclerId]);
  const recycler = result.rows[0] || null;
  if (!recycler) return null;

  const accepted = await pool.query(
    `SELECT raw.city_waste_type_id, raw.waste_type_name, cwt.name AS city_waste_type_name
     FROM recycler_accepted_waste_types raw
     LEFT JOIN city_waste_types cwt ON cwt.id = raw.city_waste_type_id
     WHERE raw.recycler_id = $1`,
    [recyclerId]
  );

  return {
    ...recycler,
    accepted_waste_type_ids: accepted.rows.map((row) => row.city_waste_type_id).filter(Boolean),
    accepted_waste_type_labels: accepted.rows.map(
      (row) => row.city_waste_type_name || row.waste_type_name
    ).filter(Boolean),
  };
};

export const listRecyclers = async ({ status, city } = {}) => {
  const params = [];
  const clauses = [];
  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (city) {
    params.push(city);
    clauses.push(`city = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(`SELECT * FROM recyclers ${where} ORDER BY company_name`, params);
  return result.rows;
};

export const createRecycler = async (payload, adminId) => {
  const {
    company_name,
    contact_person,
    phone,
    email,
    location,
    waste_types_accepted,
    buying_capacity_kg_week,
    buying_capacity_kg_month,
    city = DEFAULT_CITY,
    status = 'ACTIVE',
    create_user_account,
    user_email,
    user_password,
    user_name,
  } = payload;

  if (!company_name || !contact_person || !phone) {
    throw new Error('company_name, contact_person, and phone are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recyclerResult = await client.query(
      `INSERT INTO recyclers (
        company_name, contact_person, phone, email, location,
        waste_types_accepted, buying_capacity_kg_week, buying_capacity_kg_month,
        city, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        company_name,
        contact_person,
        phone,
        email || null,
        location || null,
        waste_types_accepted || null,
        buying_capacity_kg_week || null,
        buying_capacity_kg_month || null,
        city,
        status,
      ]
    );
    const recycler = recyclerResult.rows[0];

    let user = null;
    if (create_user_account && user_email && user_password) {
      const passwordHash = await bcrypt.hash(String(user_password), 10);
      const userResult = await client.query(
        `INSERT INTO users (name, email, phone, password_hash, role, city, recycler_id, status)
         VALUES ($1,$2,$3,$4,'RECYCLER',$5,$6,'ACTIVE') RETURNING id, name, email, role, recycler_id, status`,
        [user_name || contact_person, user_email, phone, passwordHash, city, recycler.id]
      );
      user = userResult.rows[0];
    }

    await logRecyclerAudit({
      action: 'CREATE_RECYCLER',
      entityType: 'recycler',
      entityId: recycler.id,
      adminId,
      details: { company_name },
    });

    await syncRecyclerAcceptedWasteTypes(client, recycler.id, {
      waste_types_accepted,
      accepted_waste_type_ids: payload.accepted_waste_type_ids,
    });

    await client.query('COMMIT');
    return { recycler, user };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateRecycler = async (recyclerId, payload, adminId) => {
  const existing = await getRecyclerById(recyclerId);
  if (!existing) throw new Error('Recycler not found');

  const allowed = [
    'company_name', 'contact_person', 'phone', 'email', 'location',
    'waste_types_accepted', 'buying_capacity_kg_week', 'buying_capacity_kg_month',
    'city', 'status',
  ];
  const fields = [];
  const values = [];

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      values.push(payload[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (fields.length === 0) {
    if (payload.waste_types_accepted !== undefined || payload.accepted_waste_type_ids) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await syncRecyclerAcceptedWasteTypes(client, recyclerId, payload);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    return existing;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    values.push(recyclerId);
    const result = await client.query(
      `UPDATE recyclers SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (payload.waste_types_accepted !== undefined || payload.accepted_waste_type_ids) {
      await syncRecyclerAcceptedWasteTypes(client, recyclerId, payload);
    }

    await logRecyclerAudit({
      action: 'UPDATE_RECYCLER',
      entityType: 'recycler',
      entityId: recyclerId,
      adminId,
      details: payload,
    });

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const validateBatchForRecycler = async (recyclerId, batch) => {
  const ctx = await getRecyclerAccessContext(recyclerId);
  if (!ctx || ctx.recycler.status !== 'ACTIVE') {
    throw new Error('Recycler account is not active');
  }
  if (normalizeCity(batch.city) !== ctx.approvedCity) {
    throw new Error('Batch is not in your approved city');
  }
  return ctx;
};

const requestSelect = `
  SELECT pr.*,
    b.batch_code, b.waste_type, b.recycler_sale_price_per_kg, b.collection_point_id,
    cp.name AS collection_point_name, cp.division AS collection_point_division,
    rc.company_name AS recycler_company_name
  FROM recycler_purchase_requests pr
  JOIN waste_sale_batches b ON b.id = pr.batch_id
  JOIN collection_points cp ON cp.id = b.collection_point_id
  JOIN recyclers rc ON rc.id = pr.recycler_id
`;

export const sanitizeRequestForRecycler = (row) => ({
  id: row.id,
  request_code: row.request_code,
  batch_id: row.batch_id,
  batch_code: row.batch_code,
  waste_type: row.waste_type,
  requested_kg: Number(row.requested_kg),
  expected_amount: row.expected_amount,
  status: row.status,
  recycler_note: row.recycler_note || null,
  admin_response: row.admin_response,
  rejection_reason: row.rejection_reason,
  pickup_date: row.pickup_date,
  final_kg: row.final_kg != null ? Number(row.final_kg) : null,
  final_amount: row.final_amount,
  payment_method: row.payment_method,
  payment_reference: row.payment_reference,
  collection_point_name: row.collection_point_name,
  collection_point_division: row.collection_point_division,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const getDashboardStats = async (recyclerId) => getDashboardMetricsForRecycler(recyclerId);

export const createPurchaseRequest = async (recyclerId, { batch_id, requested_kg, recycler_note }) => {
  const batch = await getBatchById(batch_id);
  if (!batch) throw new Error('Batch not found');
  if (batch.status !== 'AVAILABLE') {
    throw new Error('Batch is not available for purchase');
  }

  await validateBatchForRecycler(recyclerId, batch);

  const kg = Number(requested_kg);
  if (!(kg > 0)) throw new Error('requested_kg must be greater than 0');
  if (kg > Number(batch.available_kg)) {
    throw new Error('Requested kg exceeds available kg');
  }

  const existingPending = await pool.query(
    `SELECT id FROM recycler_purchase_requests
     WHERE batch_id = $1 AND recycler_id = $2 AND status = 'PENDING'`,
    [batch_id, recyclerId]
  );
  if (existingPending.rows.length > 0) {
    throw new Error('You already have a pending request for this batch');
  }

  const expectedAmount = roundMoney(kg, batch.recycler_sale_price_per_kg);
  const requestCode = generatePurchaseRequestCode();
  const newAvailable = Number(batch.available_kg) - kg;
  const newReserved = Number(batch.reserved_kg || 0) + kg;
  const newBatchStatus = newAvailable <= 0 ? 'RESERVED_PENDING_APPROVAL' : 'AVAILABLE';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const batchLock = await client.query(
      `SELECT available_kg, status FROM waste_sale_batches WHERE id = $1 FOR UPDATE`,
      [batch_id]
    );
    if (batchLock.rows[0]?.status !== 'AVAILABLE') {
      throw new Error('Batch is no longer available');
    }
    if (kg > Number(batchLock.rows[0].available_kg)) {
      throw new Error('Requested kg exceeds available kg');
    }

    const result = await client.query(
      `INSERT INTO recycler_purchase_requests (
        request_code, batch_id, recycler_id, collection_point_id, city_waste_type_id,
        requested_kg, expected_amount, price_per_kg_snapshot, recycler_note, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING') RETURNING *`,
      [
        requestCode,
        batch_id,
        recyclerId,
        batch.collection_point_id,
        batch.city_waste_type_id || null,
        kg,
        expectedAmount,
        batch.recycler_sale_price_per_kg,
        recycler_note || null,
      ]
    );

    await client.query(
      `UPDATE waste_sale_batches
       SET available_kg = available_kg - $2,
           reserved_kg = reserved_kg + $2,
           status = $3,
           updated_at = NOW()
       WHERE id = $1 AND status = 'AVAILABLE' AND available_kg >= $2`,
      [batch_id, kg, newBatchStatus]
    );

    await logRecyclerAudit({
      action: 'CREATE_PURCHASE_REQUEST',
      entityType: 'recycler_purchase_request',
      entityId: result.rows[0].id,
      adminId: null,
      details: { batch_id, requested_kg: kg, recycler_id: recyclerId },
    });

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listPurchaseRequestsForRecycler = async (recyclerId) => {
  const result = await pool.query(
    `${requestSelect} WHERE pr.recycler_id = $1 ORDER BY pr.created_at DESC`,
    [recyclerId]
  );
  return result.rows.map(sanitizeRequestForRecycler);
};

export const listPurchaseHistory = async (recyclerId) => {
  const result = await pool.query(
    `${requestSelect}
     WHERE pr.recycler_id = $1 AND pr.status = 'COMPLETED'
     ORDER BY pr.updated_at DESC`,
    [recyclerId]
  );
  return result.rows.map(sanitizeRequestForRecycler);
};

export const listAdminPurchaseRequests = async ({ status } = {}) => {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE pr.status = $1`;
  }
  const result = await pool.query(
    `${requestSelect}
     ${where}
     ORDER BY pr.created_at DESC`,
    params
  );
  return result.rows;
};

export const getPurchaseRequestById = async (requestId) => {
  const result = await pool.query(`${requestSelect} WHERE pr.id = $1`, [requestId]);
  return result.rows[0] || null;
};

export const approvePurchaseRequest = async (requestId, adminId, { admin_response } = {}) => {
  const request = await getPurchaseRequestById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'PENDING') throw new Error('Only pending requests can be approved');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE recycler_purchase_requests
       SET status = 'APPROVED', admin_response = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [requestId, admin_response || null]
    );

    const batchRow = await client.query(
      `SELECT available_kg, status FROM waste_sale_batches WHERE id = $1`,
      [request.batch_id]
    );
    const available = Number(batchRow.rows[0]?.available_kg || 0);
    const batchStatus = available > 0 ? 'AVAILABLE' : 'RESERVED';

    await client.query(
      `UPDATE waste_sale_batches
       SET status = $3, assigned_recycler_id = $2, updated_at = NOW()
       WHERE id = $1`,
      [request.batch_id, request.recycler_id, batchStatus]
    );

    await logRecyclerAudit({
      action: 'APPROVE_REQUEST',
      entityType: 'recycler_purchase_request',
      entityId: requestId,
      adminId,
    });

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const rejectPurchaseRequest = async (requestId, adminId, { rejection_reason, admin_response } = {}) => {
  const request = await getPurchaseRequestById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'PENDING') throw new Error('Only pending requests can be rejected');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE recycler_purchase_requests
       SET status = 'REJECTED', rejection_reason = $2, admin_response = $3, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [requestId, rejection_reason || null, admin_response || null]
    );

    const batch = await client.query(
      `SELECT available_kg, reserved_kg, verified_kg FROM waste_sale_batches WHERE id = $1 FOR UPDATE`,
      [request.batch_id]
    );
    const row = batch.rows[0];
    const returnedKg = Number(request.requested_kg);
    const newAvailable = Number(row.available_kg) + returnedKg;
    const newReserved = Math.max(0, Number(row.reserved_kg || 0) - returnedKg);

    await client.query(
      `UPDATE waste_sale_batches
       SET available_kg = $2, reserved_kg = $3, status = 'AVAILABLE', updated_at = NOW()
       WHERE id = $1`,
      [request.batch_id, newAvailable, newReserved]
    );

    await logRecyclerAudit({
      action: 'REJECT_REQUEST',
      entityType: 'recycler_purchase_request',
      entityId: requestId,
      adminId,
      details: { rejection_reason, returned_kg: returnedKg },
    });

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const schedulePickup = async (requestId, adminId, { pickup_date } = {}) => {
  const request = await getPurchaseRequestById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'APPROVED') {
    throw new Error('Request must be approved before scheduling pickup');
  }

  const updated = await pool.query(
    `UPDATE recycler_purchase_requests
     SET pickup_date = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [requestId, pickup_date || new Date()]
  );

  await pool.query(
    `UPDATE waste_sale_batches SET status = 'PICKUP_SCHEDULED', pickup_date = $2, updated_at = NOW()
     WHERE id = $1`,
    [request.batch_id, pickup_date || new Date()]
  );

  await logRecyclerAudit({
    action: 'SCHEDULE_PICKUP',
    entityType: 'recycler_purchase_request',
    entityId: requestId,
    adminId,
    details: { pickup_date },
  });

  return updated.rows[0];
};

export const confirmPickup = async (requestId, adminId, { final_kg } = {}) => {
  const request = await getPurchaseRequestById(requestId);
  if (!request) throw new Error('Request not found');
  if (!['APPROVED', 'PICKUP_SCHEDULED'].includes(request.status)) {
    throw new Error('Request must be approved or pickup scheduled');
  }

  const kg = Number(final_kg ?? request.requested_kg);
  if (!(kg > 0)) throw new Error('final_kg must be greater than 0');

  const finalAmount = roundMoney(kg, request.recycler_sale_price_per_kg);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE recycler_purchase_requests
       SET final_kg = $2, final_amount = $3, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [requestId, kg, finalAmount]
    );

    await client.query(
      `UPDATE waste_sale_batches
       SET final_pickup_kg = $2, final_total_amount = $3, status = 'PICKED_UP', updated_at = NOW()
       WHERE id = $1`,
      [request.batch_id, kg, finalAmount]
    );

    await logRecyclerAudit({
      action: 'CONFIRM_PICKUP',
      entityType: 'recycler_purchase_request',
      entityId: requestId,
      adminId,
      details: { final_kg: kg, final_amount: finalAmount },
    });

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const recordPayment = async (requestId, adminId, { payment_method, payment_reference, amount, notes } = {}) => {
  const request = await getPurchaseRequestById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.final_kg == null) throw new Error('Pickup must be confirmed before recording payment');

  const payAmount = Number(amount ?? request.final_amount);
  if (!(payAmount > 0)) throw new Error('Payment amount must be greater than 0');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE recycler_purchase_requests
       SET payment_method = $2, payment_reference = $3, updated_at = NOW()
       WHERE id = $1`,
      [requestId, payment_method || 'CASH', payment_reference || null]
    );

    await client.query(
      `INSERT INTO recycler_payments (
        purchase_request_id, batch_id, recycler_id, amount,
        payment_method, payment_reference, recorded_by_admin_id, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        requestId,
        request.batch_id,
        request.recycler_id,
        payAmount,
        payment_method || 'CASH',
        payment_reference || null,
        adminId,
        notes || null,
      ]
    );

    await client.query(
      `UPDATE waste_sale_batches
       SET payment_status = 'RECEIVED', payment_reference = $2, updated_at = NOW()
       WHERE id = $1`,
      [request.batch_id, payment_reference || null]
    );

    await logRecyclerAudit({
      action: 'RECORD_PAYMENT',
      entityType: 'recycler_purchase_request',
      entityId: requestId,
      adminId,
      details: { amount: payAmount, payment_method, payment_reference },
    });

    await client.query('COMMIT');
    return { amount: payAmount, payment_method, payment_reference };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const markSold = async (requestId, adminId) => {
  const request = await getPurchaseRequestById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.final_kg == null) throw new Error('Pickup must be confirmed');
  if (!request.payment_method && !request.payment_reference) {
    const paymentCheck = await pool.query(
      `SELECT id FROM recycler_payments WHERE purchase_request_id = $1 LIMIT 1`,
      [requestId]
    );
    if (paymentCheck.rows.length === 0) {
      throw new Error('Payment must be recorded before marking sold');
    }
  }

  const batchCheck = await pool.query(
    `SELECT payment_status FROM waste_sale_batches WHERE id = $1`,
    [request.batch_id]
  );
  if (batchCheck.rows[0]?.payment_status !== 'RECEIVED') {
    throw new Error('Batch payment must be received before marking sold');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE recycler_purchase_requests SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );

    await client.query(
      `UPDATE waste_sale_batches
       SET status = 'SOLD',
           available_kg = 0,
           sold_kg = COALESCE(sold_kg, 0) + $2,
           reserved_kg = GREATEST(0, COALESCE(reserved_kg, 0) - $2),
           updated_at = NOW()
       WHERE id = $1`,
      [request.batch_id, Number(request.final_kg || request.requested_kg)]
    );

    await logRecyclerAudit({
      action: 'MARK_SOLD',
      entityType: 'recycler_purchase_request',
      entityId: requestId,
      adminId,
    });

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getPurchaseReceipt = async (recyclerId, requestId) => {
  const result = await pool.query(
    `SELECT pr.*,
      b.batch_code, b.waste_type,
      cp.name AS collection_point_name, cp.division AS collection_point_division,
      rc.company_name
     FROM recycler_purchase_requests pr
     JOIN waste_sale_batches b ON b.id = pr.batch_id
     JOIN collection_points cp ON cp.id = b.collection_point_id
     JOIN recyclers rc ON rc.id = pr.recycler_id
     WHERE pr.id = $1 AND pr.recycler_id = $2 AND pr.status = 'COMPLETED'`,
    [requestId, recyclerId]
  );

  const row = result.rows[0];
  if (!row) throw new Error('Receipt not found');

  return {
    receipt_id: `RCPT-${row.request_code}`,
    request_code: row.request_code,
    batch_code: row.batch_code,
    waste_type: row.waste_type,
    collection_point: row.collection_point_name,
    division: row.collection_point_division,
    final_kg: Number(row.final_kg),
    final_amount: row.final_amount,
    payment_method: row.payment_method,
    payment_reference: row.payment_reference,
    pickup_date: row.pickup_date,
    completed_at: row.updated_at,
    company_name: row.company_name,
  };
};

export const getRevenueSummary = async () => {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'SOLD')::int AS sold_batches,
       COALESCE(SUM(final_total_amount) FILTER (WHERE status = 'SOLD'), 0)::int AS total_revenue,
       COALESCE(SUM(final_pickup_kg * picker_price_per_kg_snapshot) FILTER (WHERE status = 'SOLD'), 0)::int AS picker_cost_basis,
       COALESCE(SUM(final_total_amount - (final_pickup_kg * picker_price_per_kg_snapshot)) FILTER (WHERE status = 'SOLD'), 0)::int AS gross_margin
     FROM waste_sale_batches`
  );
  return result.rows[0];
};

export default {
  getRecyclerById,
  listRecyclers,
  createRecycler,
  updateRecycler,
  getDashboardStats,
  createPurchaseRequest,
  listPurchaseRequestsForRecycler,
  listPurchaseHistory,
  listAdminPurchaseRequests,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  schedulePickup,
  confirmPickup,
  recordPayment,
  markSold,
  getRevenueSummary,
};

/**
 * Module 17 — Recycler dashboard smoke test
 * Run: npm run smoke:module17
 */
import dotenv from 'dotenv';
import { assert, getBaseUrl, login, requestJson } from './smokeHelpers.mjs';

dotenv.config();

const run = async () => {
  const baseUrl = getBaseUrl();
  const adminId = process.env.SUPER_ADMIN_IDENTIFIER || process.env.CITY_ADMIN_IDENTIFIER;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.CITY_ADMIN_PASSWORD;

  assert(adminId && adminPassword, 'Set SUPER_ADMIN_IDENTIFIER and SUPER_ADMIN_PASSWORD');

  console.log('[Module 17] Starting recycler smoke test against', baseUrl);

  const adminAuth = await login({ baseUrl, identifier: adminId, password: adminPassword });

  const cpRes = await requestJson(`${baseUrl}/collection-points`, { token: adminAuth.token });
  const collectionPoint = cpRes.data?.data?.find((cp) => cp.status === 'ACTIVE');
  assert(collectionPoint?.id, 'No active collection point');

  const suffix = Date.now();
  const recyclerEmail = `recycler-smoke-${suffix}@test.local`;
  const recyclerPassword = 'RecyclerSmoke123!';

  const createRecyclerRes = await requestJson(`${baseUrl}/admin/recyclers`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      company_name: `Smoke Recycler ${suffix}`,
      contact_person: 'Smoke Tester',
      phone: `077${String(suffix).slice(-7)}`,
      email: `contact-${suffix}@test.local`,
      location: 'Kampala',
      waste_types_accepted: 'PLASTIC',
      buying_capacity_kg_week: 500,
      status: 'ACTIVE',
      create_user_account: true,
      user_email: recyclerEmail,
      user_password: recyclerPassword,
      user_name: 'Smoke Recycler User',
    },
  });

  assert(createRecyclerRes.status === 201, `Create recycler failed: ${createRecyclerRes.data?.message}`);
  const recyclerId = createRecyclerRes.data?.data?.recycler?.id;
  assert(recyclerId, 'Recycler id missing');

  const batchRes = await requestJson(`${baseUrl}/admin/waste-sale-batches`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      waste_type: 'PLASTIC',
      collection_point_id: collectionPoint.id,
      verified_kg: 25,
      picker_price_per_kg_snapshot: 700,
      recycler_sale_price_per_kg: 850,
      quality_notes: 'Clean sorted plastic',
      pickup_instructions: 'Call agent on arrival',
    },
  });

  assert(batchRes.status === 201, `Create batch failed: ${batchRes.data?.message}`);
  const batchId = batchRes.data?.data?.batch?.id;
  assert(batchId, 'Batch id missing');
  console.log('[✓] Admin created recycler and sale batch');

  const recyclerAuth = await login({
    baseUrl,
    identifier: recyclerEmail,
    password: recyclerPassword,
  });

  assert(recyclerAuth.user?.recycler_id === recyclerId, 'Recycler user should be linked');

  const inventoryRes = await requestJson(`${baseUrl}/recycler/inventory`, {
    token: recyclerAuth.token,
  });
  assert(inventoryRes.status === 200, 'Recycler inventory failed');
  const batches = inventoryRes.data?.data?.batches || [];
  assert(batches.some((b) => b.id === batchId), 'Recycler should see available batch');
  assert(!batches.some((b) => b.status === 'PENDING'), 'Recycler must not see pending waste logs');
  console.log('[✓] Recycler sees only available verified batches');

  const pendingLogsRes = await requestJson(`${baseUrl}/waste-logs?status=PENDING`, {
    token: recyclerAuth.token,
  });
  assert(pendingLogsRes.status === 403 || pendingLogsRes.status === 401, 'Recycler must not list pending waste logs');
  console.log('[✓] Recycler cannot access pending waste logs');

  const requestRes = await requestJson(`${baseUrl}/recycler/purchase-requests`, {
    method: 'POST',
    token: recyclerAuth.token,
    body: { batch_id: batchId, requested_kg: 20 },
  });
  assert(requestRes.status === 201, `Purchase request failed: ${requestRes.data?.message}`);
  const requestId = requestRes.data?.data?.request?.id;
  assert(requestId, 'Request id missing');
  console.log('[✓] Recycler submitted purchase request');

  const approveRes = await requestJson(`${baseUrl}/admin/recycler-purchase-requests/${requestId}/approve`, {
    method: 'POST',
    token: adminAuth.token,
    body: { admin_response: 'Approved for pickup' },
  });
  assert(approveRes.status === 200, `Approve failed: ${approveRes.data?.message}`);
  console.log('[✓] Admin approved request');

  await requestJson(`${baseUrl}/admin/recycler-purchase-requests/${requestId}/schedule-pickup`, {
    method: 'POST',
    token: adminAuth.token,
    body: { pickup_date: new Date().toISOString() },
  });

  const confirmRes = await requestJson(`${baseUrl}/admin/recycler-purchase-requests/${requestId}/confirm-pickup`, {
    method: 'POST',
    token: adminAuth.token,
    body: { final_kg: 19.5 },
  });
  assert(confirmRes.status === 200, `Confirm pickup failed: ${confirmRes.data?.message}`);
  console.log('[✓] Admin confirmed final pickup kg');

  const payRes = await requestJson(`${baseUrl}/admin/recycler-purchase-requests/${requestId}/record-payment`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      payment_method: 'MOBILE_MONEY',
      payment_reference: `MM-${suffix}`,
      amount: 16575,
    },
  });
  assert(payRes.status === 200, `Record payment failed: ${payRes.data?.message}`);
  console.log('[✓] Admin recorded payment');

  const soldRes = await requestJson(`${baseUrl}/admin/recycler-purchase-requests/${requestId}/mark-sold`, {
    method: 'POST',
    token: adminAuth.token,
  });
  assert(soldRes.status === 200, `Mark sold failed: ${soldRes.data?.message}`);
  console.log('[✓] Batch marked sold');

  const inventoryAfter = await requestJson(`${baseUrl}/recycler/inventory`, {
    token: recyclerAuth.token,
  });
  const stillAvailable = (inventoryAfter.data?.data?.batches || []).some((b) => b.id === batchId);
  assert(!stillAvailable, 'Sold batch should not appear in available inventory');
  console.log('[✓] Sold batch removed from available inventory');

  const historyRes = await requestJson(`${baseUrl}/recycler/purchases`, {
    token: recyclerAuth.token,
  });
  assert(historyRes.status === 200, 'Purchase history failed');
  assert(
    (historyRes.data?.data?.purchases || []).some((p) => p.id === requestId),
    'Recycler should see completed purchase'
  );
  console.log('[✓] Recycler sees purchase history');

  const recycler2Res = await requestJson(`${baseUrl}/admin/recyclers`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      company_name: `Other Recycler ${suffix}`,
      contact_person: 'Other',
      phone: `078${String(suffix).slice(-7)}`,
      create_user_account: true,
      user_email: `other-${suffix}@test.local`,
      user_password: recyclerPassword,
      user_name: 'Other Recycler',
    },
  });
  assert(recycler2Res.status === 201, 'Second recycler creation failed');

  const otherAuth = await login({
    baseUrl,
    identifier: `other-${suffix}@test.local`,
    password: recyclerPassword,
  });

  const otherRequests = await requestJson(`${baseUrl}/recycler/purchase-requests`, {
    token: otherAuth.token,
  });
  const leaked = (otherRequests.data?.data?.requests || []).some((r) => r.id === requestId);
  assert(!leaked, 'Recycler must not see another recycler purchase records');
  console.log('[✓] Recycler isolation verified');

  console.log('[Module 17] All recycler smoke tests passed.');
};

run().catch((error) => {
  console.error('[Module 17] Smoke test failed:', error.message);
  process.exitCode = 1;
});

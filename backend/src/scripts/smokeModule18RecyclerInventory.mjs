/**
 * Module 18 — Recycler inventory grouping & reservation smoke test
 */
import dotenv from 'dotenv';
import { assert, getBaseUrl, login, requestJson } from './smokeHelpers.mjs';

dotenv.config();

const run = async () => {
  const baseUrl = getBaseUrl();
  const adminId = process.env.SUPER_ADMIN_IDENTIFIER || process.env.CITY_ADMIN_IDENTIFIER;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.CITY_ADMIN_PASSWORD;
  assert(adminId && adminPassword, 'Set admin credentials');

  console.log('[Module 18] Starting inventory smoke test against', baseUrl);
  const adminAuth = await login({ baseUrl, identifier: adminId, password: adminPassword });

  const cpRes = await requestJson(`${baseUrl}/collection-points`, { token: adminAuth.token });
  const points = (cpRes.data?.data || []).filter((cp) => cp.status === 'ACTIVE');
  assert(points.length >= 2, 'Need at least 2 collection points');

  const suffix = Date.now();
  const email = `inv-recycler-${suffix}@test.local`;
  const password = 'RecyclerSmoke123!';

  const createRecycler = await requestJson(`${baseUrl}/admin/recyclers`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      company_name: `Inv Recycler ${suffix}`,
      contact_person: 'Tester',
      phone: `079${String(suffix).slice(-7)}`,
      city: 'kampala',
      waste_types_accepted: 'PLASTIC',
      status: 'ACTIVE',
      create_user_account: true,
      user_email: email,
      user_password: password,
    },
  });
  assert(createRecycler.status === 201, createRecycler.data?.message);

  const batchA = await requestJson(`${baseUrl}/admin/waste-sale-batches`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      waste_type: 'PLASTIC',
      collection_point_id: points[0].id,
      verified_kg: 400,
      picker_price_per_kg_snapshot: 700,
      recycler_sale_price_per_kg: 850,
      city: 'kampala',
    },
  });
  const batchB = await requestJson(`${baseUrl}/admin/waste-sale-batches`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      waste_type: 'PLASTIC',
      collection_point_id: points[1].id,
      verified_kg: 600,
      picker_price_per_kg_snapshot: 700,
      recycler_sale_price_per_kg: 850,
      city: 'kampala',
    },
  });
  assert(batchA.status === 201 && batchB.status === 201, 'Batch creation failed');
  const batchAId = batchA.data?.data?.batch?.id;
  const batchBId = batchB.data?.data?.batch?.id;

  const recyclerAuth = await login({ baseUrl, identifier: email, password });

  const summary = await requestJson(`${baseUrl}/recycler/inventory-summary`, { token: recyclerAuth.token });
  assert(summary.status === 200, 'Summary failed');
  const plastic = (summary.data?.data?.summary || []).find((r) => r.waste_type_name === 'PLASTIC' || String(r.waste_type_key).includes('plastic'));
  assert(plastic, 'Should see PLASTIC summary');
  assert(Number(plastic.total_available_kg) >= 1000, `Expected >=1000kg PLASTIC, got ${plastic.total_available_kg}`);
  assert(plastic.collection_point_count >= 2, 'Should show 2 collection points');
  console.log('[✓] Summary shows 1000kg PLASTIC across 2 points');

  const wasteKey = plastic.waste_type_key;
  const breakdown = await requestJson(
    `${baseUrl}/recycler/inventory-summary/${encodeURIComponent(wasteKey)}/collection-points`,
    { token: recyclerAuth.token }
  );
  assert(breakdown.status === 200, 'Breakdown failed');
  assert((breakdown.data?.data?.collection_points || []).length >= 2, 'Should list both points');
  console.log('[✓] Breakdown lists collection points separately');

  const reqA = await requestJson(`${baseUrl}/recycler/purchase-requests`, {
    method: 'POST',
    token: recyclerAuth.token,
    body: { batch_id: batchAId, requested_kg: 400, recycler_note: 'Pickup morning' },
  });
  assert(reqA.status === 201, reqA.data?.message);
  console.log('[✓] Request 400kg from Point A');

  const breakdownAfter = await requestJson(
    `${baseUrl}/recycler/inventory-summary/${encodeURIComponent(wasteKey)}/collection-points`,
    { token: recyclerAuth.token }
  );
  const pointA = (breakdownAfter.data?.data?.collection_points || []).find((p) => p.batch_id === batchAId);
  assert(!pointA || Number(pointA.available_kg) === 0, 'Point A should have 0 available after full request');
  console.log('[✓] Point A reserved pending approval');

  const otherEmail = `other-inv-${suffix}@test.local`;
  await requestJson(`${baseUrl}/admin/recyclers`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      company_name: `Other ${suffix}`,
      contact_person: 'Other',
      phone: `078${String(suffix).slice(-7)}`,
      waste_types_accepted: 'PLASTIC',
      create_user_account: true,
      user_email: otherEmail,
      user_password: password,
    },
  });
  const otherAuth = await login({ baseUrl, identifier: otherEmail, password });
  const blocked = await requestJson(`${baseUrl}/recycler/purchase-requests`, {
    method: 'POST',
    token: otherAuth.token,
    body: { batch_id: batchAId, requested_kg: 100 },
  });
  assert(blocked.status === 400, 'Other recycler should not request reserved kg');
  console.log('[✓] Other recycler blocked from reserved Point A');

  const metalBatch = await requestJson(`${baseUrl}/admin/waste-sale-batches`, {
    method: 'POST',
    token: adminAuth.token,
    body: {
      waste_type: 'METAL',
      collection_point_id: points[0].id,
      verified_kg: 100,
      picker_price_per_kg_snapshot: 500,
      recycler_sale_price_per_kg: 650,
      city: 'kampala',
    },
  });
  assert(metalBatch.status === 201, 'Metal batch failed');
  const summary2 = await requestJson(`${baseUrl}/recycler/inventory-summary`, { token: recyclerAuth.token });
  const metal = (summary2.data?.data?.summary || []).find((r) => r.waste_type_name === 'METAL');
  assert(!metal, 'Recycler should not see METAL (not accepted)');
  console.log('[✓] Recycler cannot see non-accepted waste types');

  const requestId = reqA.data?.data?.request?.id;
  await requestJson(`${baseUrl}/admin/recycler-purchase-requests/${requestId}/reject`, {
    method: 'POST',
    token: adminAuth.token,
    body: { rejection_reason: 'Test reject' },
  });
  const breakdownRejected = await requestJson(
    `${baseUrl}/recycler/inventory-summary/${encodeURIComponent(wasteKey)}/collection-points`,
    { token: recyclerAuth.token }
  );
  const pointARestored = (breakdownRejected.data?.data?.collection_points || []).find((p) => p.batch_id === batchAId);
  assert(pointARestored && Number(pointARestored.available_kg) === 400, 'Rejected kg should return to available');
  console.log('[✓] Rejected request restores available kg');

  console.log('[Module 18] All inventory smoke tests passed.');
};

run().catch((error) => {
  console.error('[Module 18] Smoke test failed:', error.message);
  process.exitCode = 1;
});

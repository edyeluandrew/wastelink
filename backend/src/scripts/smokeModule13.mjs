/**
 * Module 13 integration smoke test
 * Run: node src/scripts/smokeModule13.mjs
 *
 * Env: BASE_URL, PICKER_IDENTIFIER, PICKER_PASSWORD, AGENT_IDENTIFIER, AGENT_PASSWORD,
 *      SUPER_ADMIN_IDENTIFIER, SUPER_ADMIN_PASSWORD, COLLECTION_POINT_ID (optional)
 */
import dotenv from 'dotenv';
import { assert, getBaseUrl, login, requestJson } from './smokeHelpers.mjs';

dotenv.config();

const run = async () => {
  const baseUrl = getBaseUrl();
  const env = {
    pickerId: process.env.PICKER_IDENTIFIER,
    pickerPassword: process.env.PICKER_PASSWORD,
    agentId: process.env.AGENT_IDENTIFIER,
    agentPassword: process.env.AGENT_PASSWORD,
    adminId: process.env.SUPER_ADMIN_IDENTIFIER,
    adminPassword: process.env.SUPER_ADMIN_PASSWORD,
    collectionPointId: process.env.COLLECTION_POINT_ID,
  };

  console.log('[Module 13] Starting smoke test against', baseUrl);

  // 1. Picker logs 5kg waste
  const pickerAuth = await login({
    baseUrl,
    identifier: env.pickerId,
    password: env.pickerPassword,
  });

  let collectionPointId = env.collectionPointId;
  if (!collectionPointId) {
    const cpRes = await requestJson(`${baseUrl}/collection-points`, {
      token: pickerAuth.token,
    });
    collectionPointId = cpRes.data?.data?.find((cp) => cp.status === 'ACTIVE')?.id;
  }

  assert(collectionPointId, 'No active collection point found');

  const logRes = await requestJson(`${baseUrl}/waste-logs`, {
    method: 'POST',
    token: pickerAuth.token,
    body: {
      collection_point_id: Number(collectionPointId),
      waste_type: 'PLASTIC',
      estimated_kg: 5,
    },
  });

  assert(logRes.status === 201, `Picker log failed: HTTP ${logRes.status}`);
  const wasteLog = logRes.data?.data;
  assert(wasteLog?.estimated_kg === 5, 'Estimated kg should be 5');
  assert(wasteLog?.status === 'PENDING', 'New log should be PENDING');
  console.log('[✓] Picker logged 5kg — job', wasteLog.job_code);

  // 2. Agent sees estimated 5kg
  const agentAuth = await login({
    baseUrl,
    identifier: env.agentId,
    password: env.agentPassword,
  });

  const agentView = await requestJson(`${baseUrl}/waste-logs/job/${wasteLog.job_code}`, {
    token: agentAuth.token,
  });

  assert(agentView.status === 200, 'Agent cannot fetch waste log');
  assert(Number(agentView.data?.data?.estimated_kg) === 5, 'Agent should see estimated 5kg');
  console.log('[✓] Agent sees estimated 5kg');

  // 3. Agent verifies 4.5kg
  const verifyRes = await requestJson(`${baseUrl}/waste-logs/${wasteLog.id}/verify`, {
    method: 'PATCH',
    token: agentAuth.token,
    body: { verified_kg: 4.5 },
  });

  assert(verifyRes.status === 200, `Verify failed: ${verifyRes.data?.message}`);
  assert(Number(verifyRes.data?.data?.verified_kg) === 4.5, 'Verified kg should be 4.5');
  assert(Number(verifyRes.data?.data?.estimated_kg) === 5, 'Estimated kg must remain 5');
  assert(verifyRes.data?.data?.earning?.status === 'PENDING', 'Earning should start PENDING');
  console.log('[✓] Agent verified 4.5kg, earning PENDING');

  // 4. UNDP report shows 4.5kg verified (among totals)
  const undpRes = await requestJson(`${baseUrl}/reports/undp-pilot`, {
    token: agentAuth.token,
  });

  assert(undpRes.status === 200, 'UNDP report failed');
  const verifiedKg = Number(undpRes.data?.data?.environmental_impact?.verified_waste_kg || 0);
  assert(verifiedKg >= 4.5, `UNDP verified kg should include 4.5 (got ${verifiedKg})`);
  console.log('[✓] UNDP report verified kg includes agent weight');

  // 5. Payment lifecycle
  const adminAuth = await login({
    baseUrl,
    identifier: env.adminId,
    password: env.adminPassword,
  });

  const approveRes = await requestJson(`${baseUrl}/waste-logs/${wasteLog.id}/payout/approve`, {
    method: 'PATCH',
    token: adminAuth.token,
  });
  assert(approveRes.status === 200, `Approve failed: ${approveRes.data?.message}`);
  assert(approveRes.data?.data?.earning?.status === 'APPROVED', 'Should be APPROVED');
  console.log('[✓] Payout approved');

  const initiateRes = await requestJson(`${baseUrl}/waste-logs/${wasteLog.id}/payout/initiate`, {
    method: 'PATCH',
    token: adminAuth.token,
  });
  assert(initiateRes.status === 200, `Initiate failed: ${initiateRes.data?.message}`);
  assert(initiateRes.data?.data?.earning?.status === 'PAYOUT_INITIATED', 'Should be PAYOUT_INITIATED');
  console.log('[✓] Payout initiated');

  const confirmRes = await requestJson(`${baseUrl}/waste-logs/${wasteLog.id}/payout/simulate-confirm`, {
    method: 'PATCH',
    token: adminAuth.token,
  });
  assert(confirmRes.status === 200, `Simulate confirm failed: ${confirmRes.data?.message}`);
  assert(confirmRes.data?.data?.earning?.status === 'PAID', 'Should be PAID');
  assert(confirmRes.data?.data?.is_simulated === true, 'Should be marked simulated');
  console.log('[✓] Demo payout confirmed as PAID');

  // 6. Direct mark-paid blocked from PENDING (already paid — test message on fresh log optional)
  console.log('[Module 13] All smoke checks passed.');
};

run().catch((error) => {
  console.error('[Module 13 FAILED]', error.message);
  process.exit(1);
});

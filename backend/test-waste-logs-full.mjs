const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n========== WASTE LOGS API - COMPREHENSIVE TESTS ==========\n');

  let pickerId, collectionPointId, wasteLogId, jobCode;
  
  // Generate unique phone numbers for this test run
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const pickerPhone = `+256770${random}`;
  const agentPhone = `+256780${random}`;

  try {
    // TEST 1: Create a picker
    console.log('TEST 1: Create a picker');
    const pickerResp = await fetch(`${BASE_URL}/pickers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Moses Kato',
        phone: pickerPhone,
        gender: 'MALE',
        age_group: '25-34',
        division: 'Kawempe',
        main_waste_type: 'PLASTIC'
      })
    });
    const pickerData = await pickerResp.json();
    console.log(`  Response status: ${pickerResp.status}`);
    
    if (!pickerData.data || !pickerData.data.id) {
      console.error('  ERROR: No picker data returned!');
      console.error('  Response:', pickerData);
      process.exit(1);
    }
    pickerId = pickerData.data.id;
    console.log(`  ✅ Created picker ID: ${pickerId}\n`);

    // TEST 2: Create a collection point
    console.log('TEST 2: Create a collection point');
    const cpResp = await fetch(`${BASE_URL}/collection-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Central Waste Hub',
        division: 'Kawempe',
        agent_name: 'Robert Mwebe',
        agent_phone: agentPhone
      })
    });
    const cpData = await cpResp.json();
    console.log(`  Response status: ${cpResp.status}`);
    
    if (!cpData.data || !cpData.data.id) {
      console.error('  ERROR: No collection point data returned!');
      process.exit(1);
    }
    collectionPointId = cpData.data.id;
    console.log(`  ✅ Created collection point ID: ${collectionPointId}\n`);

    // TEST 3: POST /api/waste-logs - Create waste log
    console.log('TEST 3: POST /api/waste-logs (Create)');
    const createResp = await fetch(`${BASE_URL}/waste-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        picker_id: pickerId,
        collection_point_id: collectionPointId,
        waste_type: 'PLASTIC',
        estimated_kg: 15.5,
        notes: 'High quality plastic waste'
      })
    });
    const createData = await createResp.json();
    console.log(`Status: ${createResp.status}`);
    console.log('Response:', JSON.stringify(createData, null, 2));
    wasteLogId = createData.data.id;
    jobCode = createData.data.job_code;
    console.log(`Created waste log ID: ${wasteLogId}, Job Code: ${jobCode}\n`);

    // TEST 4: GET /api/waste-logs - List all
    console.log('TEST 4: GET /api/waste-logs (List all)');
    const getResp = await fetch(`${BASE_URL}/waste-logs`);
    const getData = await getResp.json();
    console.log(`Status: ${getResp.status}`);
    console.log(`Total waste logs: ${getData.data.length}`);
    console.log('First waste log:', JSON.stringify(getData.data[0], null, 2));
    console.log();

    // TEST 5: GET with filters
    console.log('TEST 5: GET /api/waste-logs?status=PENDING (Filter by status)');
    const filterResp = await fetch(`${BASE_URL}/waste-logs?status=PENDING`);
    const filterData = await filterResp.json();
    console.log(`Status: ${filterResp.status}`);
    console.log(`Filtered results: ${filterData.data.length}\n`);

    // TEST 6: GET by waste type
    console.log('TEST 6: GET /api/waste-logs?waste_type=PLASTIC (Filter by waste type)');
    const wasteTypeResp = await fetch(`${BASE_URL}/waste-logs?waste_type=PLASTIC`);
    const wasteTypeData = await wasteTypeResp.json();
    console.log(`Status: ${wasteTypeResp.status}`);
    console.log(`PLASTIC waste logs: ${wasteTypeData.data.length}\n`);

    // TEST 7: GET /api/waste-logs/:id - Get by ID
    console.log(`TEST 7: GET /api/waste-logs/${wasteLogId} (Get by ID)`);
    const getByIdResp = await fetch(`${BASE_URL}/waste-logs/${wasteLogId}`);
    const getByIdData = await getByIdResp.json();
    console.log(`Status: ${getByIdResp.status}`);
    console.log('Response:', JSON.stringify(getByIdData, null, 2));
    console.log();

    // TEST 8: GET /api/waste-logs/job/:jobCode - Get by job code
    console.log(`TEST 8: GET /api/waste-logs/job/${jobCode} (Get by job code)`);
    const jobCodeResp = await fetch(`${BASE_URL}/waste-logs/job/${jobCode}`);
    const jobCodeData = await jobCodeResp.json();
    console.log(`Status: ${jobCodeResp.status}`);
    console.log('Response:', JSON.stringify(jobCodeData, null, 2));
    console.log();

    // TEST 9: PATCH /api/waste-logs/:id/verify - Verify waste log
    console.log(`TEST 9: PATCH /api/waste-logs/${wasteLogId}/verify (Verify waste log)`);
    const verifyResp = await fetch(`${BASE_URL}/waste-logs/${wasteLogId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verified_kg: 14.2,
        notes: 'Verified on scale. Some moisture loss.'
      })
    });
    const verifyData = await verifyResp.json();
    console.log(`Status: ${verifyResp.status}`);
    console.log('Response:', JSON.stringify(verifyData, null, 2));
    console.log();

    // TEST 10: Confirm earning was created - GET by ID
    console.log(`TEST 10: GET /api/waste-logs/${wasteLogId} (Verify earning was created)`);
    const afterVerifyResp = await fetch(`${BASE_URL}/waste-logs/${wasteLogId}`);
    const afterVerifyData = await afterVerifyResp.json();
    console.log('Waste log after verification:', JSON.stringify(afterVerifyData.data, null, 2));
    console.log('✅ Earning created:', afterVerifyData.data.earning);
    console.log();

    // TEST 11: PATCH /api/waste-logs/:id/mark-paid - Mark as paid
    console.log(`TEST 11: PATCH /api/waste-logs/${wasteLogId}/mark-paid (Mark as paid)`);
    const paidResp = await fetch(`${BASE_URL}/waste-logs/${wasteLogId}/mark-paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    const paidData = await paidResp.json();
    console.log(`Status: ${paidResp.status}`);
    console.log('Response:', JSON.stringify(paidData, null, 2));
    console.log();

    // TEST 12: Create another waste log to test rejection
    console.log('TEST 12: Create another waste log for rejection test');
    const createResp2 = await fetch(`${BASE_URL}/waste-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        picker_id: pickerId,
        collection_point_id: collectionPointId,
        waste_type: 'ORGANIC',
        estimated_kg: 8.0
      })
    });
    const createData2 = await createResp2.json();
    const wasteLogId2 = createData2.data.id;
    console.log(`Created waste log ID: ${wasteLogId2}\n`);

    // TEST 13: PATCH /api/waste-logs/:id/reject - Reject waste log
    console.log(`TEST 13: PATCH /api/waste-logs/${wasteLogId2}/reject (Reject waste log)`);
    const rejectResp = await fetch(`${BASE_URL}/waste-logs/${wasteLogId2}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Mixed with foreign materials'
      })
    });
    const rejectData = await rejectResp.json();
    console.log(`Status: ${rejectResp.status}`);
    console.log('Response:', JSON.stringify(rejectData, null, 2));
    console.log();

    // TEST 14: Verify rejection prevents verification
    console.log(`TEST 14: Attempt to verify rejected waste log (should fail)`);
    const verifyRejectedResp = await fetch(`${BASE_URL}/waste-logs/${wasteLogId2}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified_kg: 7.5 })
    });
    const verifyRejectedData = await verifyRejectedResp.json();
    console.log(`Status: ${verifyRejectedResp.status}`);
    console.log('Response:', JSON.stringify(verifyRejectedData, null, 2));
    console.log();

    // TEST 15: Create waste log with different waste type
    console.log('TEST 15: Create waste log with E_WASTE (high value)');
    const createResp3 = await fetch(`${BASE_URL}/waste-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        picker_id: pickerId,
        collection_point_id: collectionPointId,
        waste_type: 'E_WASTE',
        estimated_kg: 5.0
      })
    });
    const createData3 = await createResp3.json();
    const wasteLogId3 = createData3.data.id;
    console.log(`Created waste log ID: ${wasteLogId3}, Waste type: E_WASTE\n`);

    // TEST 16: Verify E_WASTE to see high earning rate
    console.log(`TEST 16: Verify E_WASTE waste log (rate: 700/kg)`);
    const verifyResp3 = await fetch(`${BASE_URL}/waste-logs/${wasteLogId3}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified_kg: 4.8 })
    });
    const verifyData3 = await verifyResp3.json();
    console.log(`Status: ${verifyResp3.status}`);
    console.log('Response:', JSON.stringify(verifyData3, null, 2));
    console.log();

    // TEST 17: Final status check
    console.log('TEST 17: Final status check - GET all waste logs');
    const finalResp = await fetch(`${BASE_URL}/waste-logs`);
    const finalData = await finalResp.json();
    console.log(`Total waste logs in system: ${finalData.data.length}`);
    console.log('Status breakdown:');
    const statuses = {};
    finalData.data.forEach(log => {
      statuses[log.status] = (statuses[log.status] || 0) + 1;
    });
    Object.entries(statuses).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log();

    console.log('========== ALL TESTS COMPLETED ✅ ==========\n');
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

runTests();

const BASE_URL = 'http://localhost:5000/api/collection-points';

async function runTests() {
  console.log('\n========== COLLECTION POINTS API TESTS ==========\n');

  try {
    // Test 1: CREATE
    console.log('TEST 1: POST /api/collection-points (Create)');
    const createResp = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kawempe Collection Center',
        division: 'Kawempe',
        agent_name: 'John Ssemanda',
        agent_phone: '+256701234567',
        status: 'ACTIVE'
      })
    });
    const createData = await createResp.json();
    console.log(`Status: ${createResp.status}`);
    console.log('Response:', JSON.stringify(createData, null, 2));
    const pointId = createData.data?.id;
    console.log(`Created point ID: ${pointId}\n`);

    // Test 2: CREATE another point for testing
    console.log('TEST 2: Create second collection point');
    const create2Resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Makindye Collection Center',
        division: 'Makindye',
        agent_name: 'Jane Nakato',
        agent_phone: '+256702345678',
        status: 'ACTIVE'
      })
    });
    const create2Data = await create2Resp.json();
    console.log(`Status: ${create2Resp.status}`);
    console.log('Response:', JSON.stringify(create2Data, null, 2));
    const pointId2 = create2Data.data?.id;
    console.log(`Created point ID: ${pointId2}\n`);

    // Test 3: GET ALL
    console.log('TEST 3: GET /api/collection-points (List all)');
    const getResp = await fetch(BASE_URL);
    const getData = await getResp.json();
    console.log(`Status: ${getResp.status}`);
    console.log('Response:', JSON.stringify(getData, null, 2));
    console.log(`Total points: ${getData.data.length}\n`);

    // Test 4: GET WITH FILTERS
    console.log('TEST 4: GET /api/collection-points?division=Kawempe (Filter by division)');
    const filterResp = await fetch(`${BASE_URL}?division=Kawempe`);
    const filterData = await filterResp.json();
    console.log(`Status: ${filterResp.status}`);
    console.log('Response:', JSON.stringify(filterData, null, 2));
    console.log(`Filtered results: ${filterData.data.length}\n`);

    // Test 5: GET BY ID
    if (pointId) {
      console.log(`TEST 5: GET /api/collection-points/${pointId} (Get by ID)`);
      const getByIdResp = await fetch(`${BASE_URL}/${pointId}`);
      const getByIdData = await getByIdResp.json();
      console.log(`Status: ${getByIdResp.status}`);
      console.log('Response:', JSON.stringify(getByIdData, null, 2));
      console.log();
    }

    // Test 6: UPDATE
    if (pointId) {
      console.log(`TEST 6: PATCH /api/collection-points/${pointId} (Update)`);
      const updateResp = await fetch(`${BASE_URL}/${pointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Kawempe Main Collection Center',
          agent_name: 'John Semanda Updated'
        })
      });
      const updateData = await updateResp.json();
      console.log(`Status: ${updateResp.status}`);
      console.log('Response:', JSON.stringify(updateData, null, 2));
      console.log();
    }

    // Test 7: DEACTIVATE
    if (pointId2) {
      console.log(`TEST 7: PATCH /api/collection-points/${pointId2}/deactivate (Deactivate)`);
      const deactivateResp = await fetch(`${BASE_URL}/${pointId2}/deactivate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const deactivateData = await deactivateResp.json();
      console.log(`Status: ${deactivateResp.status}`);
      console.log('Response:', JSON.stringify(deactivateData, null, 2));
      console.log();
    }

    // Test 8: GET ALL (after changes)
    console.log('TEST 8: GET /api/collection-points (Final list after updates)');
    const finalResp = await fetch(BASE_URL);
    const finalData = await finalResp.json();
    console.log(`Status: ${finalResp.status}`);
    console.log('Response:', JSON.stringify(finalData, null, 2));
    console.log();

    console.log('========== ALL TESTS COMPLETED ==========\n');
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

runTests();

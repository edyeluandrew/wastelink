const BASE_URL = 'http://localhost:5000/api/dashboard';

async function runTests() {
  console.log('\n========== DASHBOARD API - COMPREHENSIVE TESTS ==========\n');

  try {
    // TEST 1: Overall stats
    console.log('TEST 1: GET /api/dashboard/stats (Overall statistics)');
    const statsResp = await fetch(`${BASE_URL}/stats`);
    const statsData = await statsResp.json();
    console.log(`Status: ${statsResp.status}`);
    console.log('Response:', JSON.stringify(statsData, null, 2));
    console.log();

    // TEST 2: Divisions
    console.log('TEST 2: GET /api/dashboard/divisions (Performance by division)');
    const divisionsResp = await fetch(`${BASE_URL}/divisions`);
    const divisionsData = await divisionsResp.json();
    console.log(`Status: ${divisionsResp.status}`);
    console.log(`Total divisions: ${divisionsData.data.length}`);
    console.log('Sample division:', JSON.stringify(divisionsData.data[0], null, 2));
    console.log();

    // TEST 3: Recent logs
    console.log('TEST 3: GET /api/dashboard/recent-logs (Latest waste logs)');
    const recentResp = await fetch(`${BASE_URL}/recent-logs?limit=5`);
    const recentData = await recentResp.json();
    console.log(`Status: ${recentResp.status}`);
    console.log(`Recent logs: ${recentData.data.length}`);
    if (recentData.data.length > 0) {
      console.log('Sample log:', JSON.stringify(recentData.data[0], null, 2));
    }
    console.log();

    // TEST 4: Waste types
    console.log('TEST 4: GET /api/dashboard/waste-types (Waste performance by type)');
    const wasteTypesResp = await fetch(`${BASE_URL}/waste-types`);
    const wasteTypesData = await wasteTypesResp.json();
    console.log(`Status: ${wasteTypesResp.status}`);
    console.log(`Waste types found: ${wasteTypesData.data.length}`);
    if (wasteTypesData.data.length > 0) {
      console.log('Sample waste type:', JSON.stringify(wasteTypesData.data[0], null, 2));
    }
    console.log();

    // TEST 5: Top pickers
    console.log('TEST 5: GET /api/dashboard/top-pickers (Top performing pickers)');
    const topPickersResp = await fetch(`${BASE_URL}/top-pickers?limit=5`);
    const topPickersData = await topPickersResp.json();
    console.log(`Status: ${topPickersResp.status}`);
    console.log(`Top pickers: ${topPickersData.data.length}`);
    if (topPickersData.data.length > 0) {
      console.log('Sample top picker:', JSON.stringify(topPickersData.data[0], null, 2));
    }
    console.log();

    // TEST 6: Collection point performance
    console.log('TEST 6: GET /api/dashboard/collection-point-performance');
    const cpPerfResp = await fetch(`${BASE_URL}/collection-point-performance`);
    const cpPerfData = await cpPerfResp.json();
    console.log(`Status: ${cpPerfResp.status}`);
    console.log(`Collection points: ${cpPerfData.data.length}`);
    if (cpPerfData.data.length > 0) {
      console.log('Sample CP:', JSON.stringify(cpPerfData.data[0], null, 2));
    }
    console.log();

    // TEST 7: Today's activity
    console.log('TEST 7: GET /api/dashboard/today (Today\'s activity)');
    const todayResp = await fetch(`${BASE_URL}/today`);
    const todayData = await todayResp.json();
    console.log(`Status: ${todayResp.status}`);
    console.log('Response:', JSON.stringify(todayData, null, 2));
    console.log();

    console.log('========== ALL TESTS COMPLETED ✅ ==========\n');
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

runTests();

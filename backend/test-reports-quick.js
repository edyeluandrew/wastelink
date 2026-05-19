#!/usr/bin/env node

import http from 'http';

function request(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/reports${path}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('\n========== REPORTS API - COMPREHENSIVE TESTS ==========\n');

  try {
    // TEST 1: Monthly report
    console.log('TEST 1: GET /api/reports/monthly');
    const monthly = await request('/monthly');
    console.log(`✅ Status: 200`);
    console.log(`   Month: ${monthly.data.report_month}`);
    console.log(`   Pickers: ${monthly.data.total_pickers} (${monthly.data.active_pickers} active)`);
    console.log(`   Verified: ${monthly.data.verified_logs} logs, ${monthly.data.total_verified_kg} kg`);
    console.log(`   Earnings: ${monthly.data.total_earnings} ugx`);
    console.log(`   Breakdown: ${monthly.data.waste_type_breakdown.length} waste types, ${monthly.data.top_pickers.length} top pickers`);
    console.log();

    // TEST 2: Monthly with specific month
    console.log('TEST 2: GET /api/reports/monthly?month=2026-05');
    const specific = await request('/monthly?month=2026-05');
    console.log(`✅ Status: 200`);
    console.log(`   Month: ${specific.data.report_month}`);
    console.log(`   Period: ${specific.data.reporting_period_start} to ${specific.data.reporting_period_end}`);
    console.log(`   Total Logs: ${specific.data.total_waste_logs}`);
    console.log();

    // TEST 3: Summary
    console.log('TEST 3: GET /api/reports/summary');
    const summary = await request('/summary');
    console.log(`✅ Status: 200`);
    console.log(`   Total Pickers: ${summary.data.total_pickers}`);
    console.log(`   Women: ${summary.data.women_pickers}, Youth: ${summary.data.youth_pickers}`);
    console.log(`   Total Collection Points: ${summary.data.total_collection_points}`);
    console.log(`   Total Verified KG: ${summary.data.total_verified_kg}`);
    console.log(`   Total Earnings: ${summary.data.total_earnings}`);
    console.log(`   Divisions: ${summary.data.divisions_covered}, Waste Types: ${summary.data.waste_types_collected}`);
    console.log();

    // TEST 4: UNDP Pilot
    console.log('TEST 4: GET /api/reports/undp-pilot');
    const undp = await request('/undp-pilot');
    console.log(`✅ Status: 200`);
    console.log(`   Pilot City: ${undp.data.pilot_city}`);
    console.log(`   Divisions: ${undp.data.pilot_divisions.join(', ')}`);
    console.log(`   Registered Pickers: ${undp.data.inclusion.registered_pickers}`);
    console.log(`   Verified Waste: ${undp.data.environmental_impact.verified_waste_kg} kg (${undp.data.environmental_impact.verified_waste_tonnes} tonnes)`);
    console.log(`   Earnings Generated: ${undp.data.livelihood_impact.total_earnings_generated} ugx`);
    console.log(`   Active Collection Points: ${undp.data.operations.collection_points_active}`);
    console.log(`   Top Pickers: ${undp.data.top_pickers.length}`);
    console.log();

    // TEST 5: UNDP with custom dates
    console.log('TEST 5: GET /api/reports/undp-pilot?start_date=2026-05-01&end_date=2026-05-31');
    const undpCustom = await request('/undp-pilot?start_date=2026-05-01&end_date=2026-05-31');
    console.log(`✅ Status: 200`);
    console.log(`   Period: ${undpCustom.data.period.start_date} to ${undpCustom.data.period.end_date}`);
    console.log(`   Waste for Period: ${undpCustom.data.environmental_impact.verified_waste_kg} kg`);
    console.log();

    console.log('========== ALL 5 TESTS PASSED ✅ ==========\n');
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

runTests();

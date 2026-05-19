const BASE_URL = 'http://localhost:5000/api/reports';

async function runTests() {
  console.log('\n========== REPORTS API - COMPREHENSIVE TESTS ==========\n');

  try {
    // TEST 1: Monthly report (current month)
    console.log('TEST 1: GET /api/reports/monthly (Current month)');
    const monthlyResp = await fetch(`${BASE_URL}/monthly`);
    const monthlyData = await monthlyResp.json();
    console.log(`Status: ${monthlyResp.status}`);
    console.log(`Report Month: ${monthlyData.data.report_month}`);
    console.log(`Period: ${monthlyData.data.reporting_period_start} to ${monthlyData.data.reporting_period_end}`);
    console.log(`Pickers: ${monthlyData.data.total_pickers} (${monthlyData.data.active_pickers} active)`);
    console.log(`Women/Youth: ${monthlyData.data.women_pickers} (${monthlyData.data.women_percentage}%) / ${monthlyData.data.youth_pickers} (${monthlyData.data.youth_percentage}%)`);
    console.log(`Waste Logs: ${monthlyData.data.verified_logs} verified, ${monthlyData.data.pending_logs} pending, ${monthlyData.data.rejected_logs} rejected`);
    console.log(`Verified KG: ${monthlyData.data.total_verified_kg} kg`);
    console.log(`Earnings: ${monthlyData.data.total_earnings} ugx (Paid: ${monthlyData.data.paid_earnings}, Pending: ${monthlyData.data.pending_earnings})`);
    console.log(`Waste Types: ${monthlyData.data.waste_type_breakdown.length} types`);
    console.log(`Top Pickers: ${monthlyData.data.top_pickers.length}`);
    console.log(`Recent Verified Logs: ${monthlyData.data.recent_verified_logs.length}`);
    console.log();

    // TEST 2: Monthly report with specific month parameter
    console.log('TEST 2: GET /api/reports/monthly?month=2026-05 (Specific month)');
    const specificResp = await fetch(`${BASE_URL}/monthly?month=2026-05`);
    const specificData = await specificResp.json();
    console.log(`Status: ${specificResp.status}`);
    console.log(`Report Month: ${specificData.data.report_month}`);
    console.log(`Period: ${specificData.data.reporting_period_start} to ${specificData.data.reporting_period_end}`);
    console.log(`Total Waste Logs: ${specificData.data.total_waste_logs}`);
    console.log();

    // TEST 3: Platform summary
    console.log('TEST 3: GET /api/reports/summary (All-time platform summary)');
    const summaryResp = await fetch(`${BASE_URL}/summary`);
    const summaryData = await summaryResp.json();
    console.log(`Status: ${summaryResp.status}`);
    console.log(`Total Pickers: ${summaryData.data.total_pickers}`);
    console.log(`Women Pickers: ${summaryData.data.women_pickers}, Youth Pickers: ${summaryData.data.youth_pickers}`);
    console.log(`Total Collection Points: ${summaryData.data.total_collection_points}`);
    console.log(`Total Verified KG: ${summaryData.data.total_verified_kg} kg`);
    console.log(`Total Earnings: ${summaryData.data.total_earnings} ugx`);
    console.log(`  - Paid: ${summaryData.data.total_paid_earnings}`);
    console.log(`  - Pending: ${summaryData.data.total_pending_earnings}`);
    console.log(`Total Verified Jobs: ${summaryData.data.total_verified_jobs}`);
    console.log(`Total Rejected Jobs: ${summaryData.data.total_rejected_jobs}`);
    console.log(`Divisions Covered: ${summaryData.data.divisions_covered}`);
    console.log(`Waste Types Collected: ${summaryData.data.waste_types_collected}`);
    console.log();

    // TEST 4: UNDP Pilot Report (current month)
    console.log('TEST 4: GET /api/reports/undp-pilot (Current month)');
    const undpResp = await fetch(`${BASE_URL}/undp-pilot`);
    const undpData = await undpResp.json();
    console.log(`Status: ${undpResp.status}`);
    console.log(`Pilot City: ${undpData.data.pilot_city}`);
    console.log(`Pilot Divisions: ${undpData.data.pilot_divisions.join(', ')}`);
    console.log(`Period: ${undpData.data.period.start_date} to ${undpData.data.period.end_date}`);
    console.log(`\nInclusion:`);
    console.log(`  Registered Pickers: ${undpData.data.inclusion.registered_pickers}`);
    console.log(`  Women: ${undpData.data.inclusion.women_pickers} (${undpData.data.inclusion.women_percentage}%)`);
    console.log(`  Youth: ${undpData.data.inclusion.youth_pickers} (${undpData.data.inclusion.youth_percentage}%)`);
    console.log(`\nEnvironmental Impact:`);
    console.log(`  Verified Waste: ${undpData.data.environmental_impact.verified_waste_kg} kg (${undpData.data.environmental_impact.verified_waste_tonnes} tonnes)`);
    console.log(`  Waste Types: ${undpData.data.environmental_impact.waste_type_breakdown.length}`);
    console.log(`\nLivelihood Impact:`);
    console.log(`  Total Earnings: ${undpData.data.livelihood_impact.total_earnings_generated} ugx`);
    console.log(`  Paid: ${undpData.data.livelihood_impact.paid_earnings}, Pending: ${undpData.data.livelihood_impact.pending_earnings}`);
    console.log(`  Average per Picker: ${undpData.data.livelihood_impact.average_earning_per_picker} ugx`);
    console.log(`\nOperations:`);
    console.log(`  Active Collection Points: ${undpData.data.operations.collection_points_active}`);
    console.log(`  Total Logs: ${undpData.data.operations.total_waste_logs}`);
    console.log(`  Verified/Rejected: ${undpData.data.operations.verified_logs}/${undpData.data.operations.rejected_logs}`);
    console.log(`\nDivision Performance: ${undpData.data.division_performance.length} divisions`);
    if (undpData.data.division_performance.length > 0) {
      const div = undpData.data.division_performance[0];
      console.log(`  Sample: ${div.division} - ${div.pickers_count} pickers, ${div.verified_kg} kg, ${div.total_earnings} ugx`);
    }
    console.log(`\nCollection Point Performance: ${undpData.data.collection_point_performance.length} points`);
    console.log(`Top Pickers: ${undpData.data.top_pickers.length}`);
    console.log();

    // TEST 5: UNDP Pilot Report with custom date range
    console.log('TEST 5: GET /api/reports/undp-pilot?start_date=2026-05-01&end_date=2026-05-31 (Custom dates)');
    const undpCustomResp = await fetch(`${BASE_URL}/undp-pilot?start_date=2026-05-01&end_date=2026-05-31`);
    const undpCustomData = await undpCustomResp.json();
    console.log(`Status: ${undpCustomResp.status}`);
    console.log(`Period: ${undpCustomData.data.period.start_date} to ${undpCustomData.data.period.end_date}`);
    console.log(`Verified Waste for Period: ${undpCustomData.data.environmental_impact.verified_waste_kg} kg`);
    console.log();

    // TEST 6: Validate waste type breakdown in monthly report
    console.log('TEST 6: Validate waste_type_breakdown structure');
    if (monthlyData.data.waste_type_breakdown.length > 0) {
      const wt = monthlyData.data.waste_type_breakdown[0];
      console.log(`Sample waste type:`);
      console.log(`  Waste Type: ${wt.waste_type}`);
      console.log(`  Total Logs: ${wt.total_logs}`);
      console.log(`  Verified Logs: ${wt.verified_logs}`);
      console.log(`  Total Verified KG: ${wt.total_verified_kg}`);
      console.log(`  Total Earnings: ${wt.total_earnings} ugx`);
    }
    console.log();

    // TEST 7: Validate division breakdown in monthly report
    console.log('TEST 7: Validate division_breakdown structure');
    if (monthlyData.data.division_breakdown.length > 0) {
      const div = monthlyData.data.division_breakdown[0];
      console.log(`Sample division:`);
      console.log(`  Division: ${div.division}`);
      console.log(`  Total Pickers: ${div.total_pickers}`);
      console.log(`  Total Logs: ${div.total_logs}`);
      console.log(`  Verified Logs: ${div.verified_logs}`);
      console.log(`  Total Verified KG: ${div.total_verified_kg}`);
      console.log(`  Total Earnings: ${div.total_earnings} ugx`);
    }
    console.log();

    // TEST 8: Validate top pickers in monthly report
    console.log('TEST 8: Validate top_pickers structure');
    if (monthlyData.data.top_pickers.length > 0) {
      const tp = monthlyData.data.top_pickers[0];
      console.log(`Sample top picker:`);
      console.log(`  Picker: ${tp.name} (${tp.picker_code})`);
      console.log(`  Phone: ${tp.phone}`);
      console.log(`  Gender: ${tp.gender}, Age Group: ${tp.age_group}`);
      console.log(`  Division: ${tp.division}`);
      console.log(`  Verified Jobs: ${tp.verified_jobs}`);
      console.log(`  Total Verified KG: ${tp.total_verified_kg}`);
      console.log(`  Total Earnings: ${tp.total_earnings} ugx`);
    }
    console.log();

    // TEST 9: Validate recent verified logs in monthly report
    console.log('TEST 9: Validate recent_verified_logs structure');
    if (monthlyData.data.recent_verified_logs.length > 0) {
      const rvl = monthlyData.data.recent_verified_logs[0];
      console.log(`Sample recent verified log:`);
      console.log(`  Job Code: ${rvl.job_code}`);
      console.log(`  Picker: ${rvl.picker_name} (${rvl.picker_code})`);
      console.log(`  Waste Type: ${rvl.waste_type}`);
      console.log(`  Verified KG: ${rvl.verified_kg}`);
      console.log(`  Collection Point: ${rvl.collection_point_name}`);
      console.log(`  Verified At: ${rvl.verified_at}`);
      console.log(`  Earning Amount: ${rvl.earning_amount} ugx`);
    }
    console.log();

    console.log('========== ALL TESTS COMPLETED ✅ ==========\n');
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

runTests();

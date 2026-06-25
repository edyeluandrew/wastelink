import ExcelJS from 'exceljs';
import { formatCityLabel } from './cityReportFilters.js';

const headerStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } },
};

const addSheetFromObjects = (workbook, name, rows, columns) => {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 18,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = headerStyle.font;
    cell.fill = headerStyle.fill;
  });

  rows.forEach((row) => sheet.addRow(row));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
};

export const generateCityReportXlsx = async (pack) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WasteLink Uganda';
  workbook.created = new Date();

  const { meta, sheets, executive_summary: summary } = pack;

  addSheetFromObjects(workbook, 'Executive Summary', sheets.executive_summary, [
    { header: 'Metric', key: 'metric', width: 34 },
    { header: 'Value', key: 'value', width: 28 },
  ]);

  addSheetFromObjects(workbook, 'Waste by Type', sheets.waste_by_type, [
    { header: 'Waste Type', key: 'waste_type_name', width: 24 },
    { header: 'Reporting Category', key: 'reporting_category', width: 22 },
    { header: 'Total Logs', key: 'total_logs' },
    { header: 'Verified Logs', key: 'verified_logs' },
    { header: 'Pending Logs', key: 'pending_logs' },
    { header: 'Rejected Logs', key: 'rejected_logs' },
    { header: 'Estimated KG', key: 'estimated_kg' },
    { header: 'Verified KG', key: 'verified_kg' },
    { header: 'Earnings (UGX)', key: 'total_earnings' },
  ]);

  addSheetFromObjects(workbook, 'Waste by Collection Point', sheets.waste_by_collection_point, [
    { header: 'Point Code', key: 'point_code', width: 14 },
    { header: 'Collection Point', key: 'collection_point_name', width: 26 },
    { header: 'Division', key: 'division', width: 16 },
    { header: 'Agent', key: 'agent_name', width: 20 },
    { header: 'Total Logs', key: 'total_logs' },
    { header: 'Verified Logs', key: 'verified_logs' },
    { header: 'Pending Logs', key: 'pending_logs' },
    { header: 'Rejected Logs', key: 'rejected_logs' },
    { header: 'Estimated KG', key: 'estimated_kg' },
    { header: 'Verified KG', key: 'verified_kg' },
    { header: 'Earnings (UGX)', key: 'total_earnings' },
  ]);

  addSheetFromObjects(workbook, 'Picker Participation', sheets.picker_participation, [
    { header: 'Gender', key: 'gender', width: 14 },
    { header: 'Age Group', key: 'age_group', width: 16 },
    { header: 'Pickers', key: 'pickers' },
    { header: 'Total Logs', key: 'total_logs' },
    { header: 'Verified Logs', key: 'verified_logs' },
    { header: 'Verified KG', key: 'verified_kg' },
    { header: 'Earnings (UGX)', key: 'total_earnings' },
  ]);

  const earningsRows = [
    { item: 'Verified earnings at agent verify (UGX)', amount: sheets.earnings_withdrawals.earnings.verified_earnings },
    { item: 'Disbursed to mobile money (UGX)', amount: sheets.earnings_withdrawals.earnings.disbursed_earnings },
    { item: 'Processing disbursements (UGX)', amount: sheets.earnings_withdrawals.earnings.in_flight_earnings },
    { item: 'In wallet / not yet withdrawn (UGX)', amount: sheets.earnings_withdrawals.earnings.in_wallet_earnings },
    { item: '', amount: '' },
    ...sheets.earnings_withdrawals.withdrawals.map((row) => ({
      item: `Withdrawal #${row.id} · ${row.picker_code}`,
      amount: row.amount,
      picker_name: row.picker_name,
      status: row.status,
      provider: row.provider,
      created_at: row.created_at,
    })),
  ];

  addSheetFromObjects(workbook, 'Earnings and Withdrawals', earningsRows, [
    { header: 'Item', key: 'item', width: 34 },
    { header: 'Amount (UGX)', key: 'amount', width: 16 },
    { header: 'Picker', key: 'picker_name', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Provider', key: 'provider', width: 12 },
    { header: 'Created At', key: 'created_at', width: 22 },
  ]);

  addSheetFromObjects(workbook, 'Agent Verification', sheets.agent_verification, [
    { header: 'Point Code', key: 'point_code', width: 14 },
    { header: 'Collection Point', key: 'collection_point_name', width: 26 },
    { header: 'Division', key: 'division', width: 16 },
    { header: 'Agent', key: 'agent_name', width: 20 },
    { header: 'Total Logs', key: 'total_logs' },
    { header: 'Pending', key: 'pending_logs' },
    { header: 'Verified', key: 'verified_logs' },
    { header: 'Rejected', key: 'rejected_logs' },
    { header: 'Verification Rate %', key: 'verification_rate_pct' },
    { header: 'Verified KG', key: 'verified_kg' },
    { header: 'Avg Hours to Verify', key: 'avg_hours_to_verify' },
  ]);

  addSheetFromObjects(workbook, 'Raw Data', sheets.raw_data, [
    { header: 'Job Code', key: 'job_code', width: 16 },
    { header: 'Logged At', key: 'logged_at', width: 20 },
    { header: 'Verified At', key: 'verified_at', width: 20 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Waste Type', key: 'waste_type', width: 18 },
    { header: 'City Waste Type', key: 'city_waste_type_name', width: 20 },
    { header: 'Reporting Category', key: 'reporting_category', width: 20 },
    { header: 'Estimated KG', key: 'estimated_kg' },
    { header: 'Verified KG', key: 'verified_kg' },
    { header: 'Picker Code', key: 'picker_code', width: 14 },
    { header: 'Picker Name', key: 'picker_name', width: 20 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Age Group', key: 'age_group', width: 14 },
    { header: 'Picker Division', key: 'picker_division', width: 16 },
    { header: 'Point Code', key: 'point_code', width: 14 },
    { header: 'Collection Point', key: 'collection_point_name', width: 24 },
    { header: 'Division', key: 'division', width: 16 },
    { header: 'Agent', key: 'agent_name', width: 18 },
    { header: 'Earning (UGX)', key: 'earning_amount' },
    { header: 'Earning Status', key: 'earning_status', width: 16 },
  ]);

  const infoSheet = workbook.addWorksheet('_Report Info');
  infoSheet.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  infoSheet.addRows([
    { field: 'City', value: meta.city_label },
    { field: 'Period', value: `${meta.reporting_period_start} to ${meta.reporting_period_end}` },
    { field: 'Generated at', value: meta.generated_at },
    { field: 'Report type', value: 'Monthly City Report + UNDP Pilot Impact Report' },
    { field: 'Verified kg', value: summary.total_verified_kg },
    { field: 'Confirmed earnings (UGX)', value: summary.confirmed_earnings },
    { field: 'UNDP narrative', value: pack.undp.narrative },
    { field: 'Raw data truncated', value: meta.raw_data_truncated ? 'Yes (10,000 row cap)' : 'No' },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  const slugCity = formatCityLabel(meta.city).replace(/\s+/g, '-');
  const periodSlug = meta.report_month || `${meta.reporting_period_start}_${meta.reporting_period_end}`;
  const filename = `WasteLink-${slugCity}-Report-${periodSlug}.xlsx`;

  return { buffer: Buffer.from(buffer), filename };
};

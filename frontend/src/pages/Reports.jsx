import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
  Button,
} from '../components';
import {
  formatCurrencyUGX,
  formatKg,
  formatTonnes,
  formatPercentage,
  formatNumber,
  formatStatus,
} from '../utils/formatters';
import api from '../api/axios';

export default function Reports() {
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [summaryReport, setSummaryReport] = useState(null);
  const [undpReport, setUndpReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [monthFilter, setMonthFilter] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [undpStartDate, setUndpStartDate] = useState('');
  const [undpEndDate, setUndpEndDate] = useState('');
  const [customDateMode, setCustomDateMode] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (month = monthFilter, startDate = '', endDate = '') => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (month) params.month = month;

      const queries = [api.get('/reports/summary')];

      // Monthly report
      queries.push(api.get('/reports/monthly', { params: { month } }));

      // UNDP report with optional dates
      if (customDateMode && startDate && endDate) {
        queries.push(
          api.get('/reports/undp-pilot', {
            params: { start_date: startDate, end_date: endDate },
          })
        );
      } else {
        queries.push(api.get('/reports/undp-pilot', { params: { month } }));
      }

      const [summaryRes, monthlyRes, undpRes] = await Promise.all(queries);

      setSummaryReport(summaryRes.data.data);
      setMonthlyReport(monthlyRes.data.data);
      setUndpReport(undpRes.data.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonthFilter(newMonth);
    fetchReports(newMonth, undpStartDate, undpEndDate);
  };

  const handleUndpDateChange = () => {
    if (customDateMode && undpStartDate && undpEndDate) {
      fetchReports(monthFilter, undpStartDate, undpEndDate);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchReports} />;

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-wastelink-dark mb-2">
            Report Month
          </label>
          <input
            type="month"
            value={monthFilter}
            onChange={handleMonthChange}
            className="border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={customDateMode}
              onChange={(e) => setCustomDateMode(e.target.checked)}
              className="border border-wastelink-border rounded"
            />
            <span className="text-sm font-medium text-wastelink-dark">
              Use custom date range for UNDP report
            </span>
          </label>

          {customDateMode && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-wastelink-dark mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={undpStartDate}
                    onChange={(e) => setUndpStartDate(e.target.value)}
                    className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-wastelink-dark mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={undpEndDate}
                    onChange={(e) => setUndpEndDate(e.target.value)}
                    className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                  />
                </div>
              </div>
              <Button onClick={handleUndpDateChange} size="sm">
                Load Report
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Platform Summary */}
      {summaryReport && (
        <div>
          <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
            All-Time Platform Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Pickers"
              value={formatNumber(summaryReport.total_pickers)}
            />
            <StatCard
              title="Women Pickers"
              value={formatNumber(summaryReport.women_pickers)}
            />
            <StatCard
              title="Youth Pickers"
              value={formatNumber(summaryReport.youth_pickers)}
            />
            <StatCard
              title="Collection Points"
              value={formatNumber(summaryReport.total_collection_points)}
            />
            <StatCard
              title="Total Verified Waste"
              value={formatKg(summaryReport.total_verified_kg)}
            />
            <StatCard
              title="Total Earnings"
              value={formatCurrencyUGX(summaryReport.total_earnings)}
            />
            <StatCard
              title="Verified Jobs"
              value={formatNumber(summaryReport.total_verified_jobs)}
            />
            <StatCard
              title="Divisions Covered"
              value={formatNumber(summaryReport.divisions_covered)}
            />
          </div>
        </div>
      )}

      {/* Monthly Report */}
      {monthlyReport && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
              Monthly Report - {monthlyReport.report_month}
            </h3>
            <p className="text-sm text-wastelink-muted mb-4">
              Period: {monthlyReport.reporting_period_start} to{' '}
              {monthlyReport.reporting_period_end}
            </p>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Pickers (Active)"
                value={`${monthlyReport.total_pickers} (${monthlyReport.active_pickers})`}
              />
              <StatCard
                title="Women %"
                value={formatPercentage(monthlyReport.women_percentage)}
              />
              <StatCard
                title="Youth %"
                value={formatPercentage(monthlyReport.youth_percentage)}
              />
              <StatCard
                title="Collection Points"
                value={formatNumber(monthlyReport.total_collection_points)}
              />
              <StatCard
                title="Total Logs"
                value={formatNumber(monthlyReport.total_waste_logs)}
              />
              <StatCard
                title="Verified Logs"
                value={formatNumber(monthlyReport.verified_logs)}
              />
              <StatCard
                title="Pending Logs"
                value={formatNumber(monthlyReport.pending_logs)}
              />
              <StatCard
                title="Rejected Logs"
                value={formatNumber(monthlyReport.rejected_logs)}
              />
              <StatCard
                title="Total Est. KG"
                value={formatKg(monthlyReport.total_estimated_kg)}
              />
              <StatCard
                title="Total Ver. KG"
                value={formatKg(monthlyReport.total_verified_kg)}
              />
              <StatCard
                title="Pending / Unverified KG"
                value={formatKg(monthlyReport.pending_unverified_kg || 0)}
              />
              <StatCard
                title="Total Earnings"
                value={formatCurrencyUGX(monthlyReport.total_earnings)}
              />
              <StatCard
                title="Paid Earnings"
                value={formatCurrencyUGX(monthlyReport.paid_earnings)}
              />
            </div>
          </div>

          {/* Waste Type Breakdown */}
          {monthlyReport.waste_type_breakdown?.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">
                Waste Type Breakdown
              </h4>
              <DataTable
                columns={[
                  'Waste Type',
                  'Total Logs',
                  'Verified Logs',
                  'Total KG',
                  'Total Earnings',
                ]}
              >
                {monthlyReport.waste_type_breakdown.map((item, idx) => (
                  <tr key={idx} className="border-b border-wastelink-border hover:bg-gray-50">
                    <td className="table-cell font-medium">{formatStatus(item.waste_type)}</td>
                    <td className="table-cell">{formatNumber(item.total_logs)}</td>
                    <td className="table-cell">{formatNumber(item.verified_logs)}</td>
                    <td className="table-cell">{formatKg(item.total_verified_kg)}</td>
                    <td className="table-cell">{formatCurrencyUGX(item.total_earnings)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}

          {/* Division Breakdown */}
          {monthlyReport.division_breakdown?.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">
                Division Performance
              </h4>
              <DataTable
                columns={[
                  'Division',
                  'Total Pickers',
                  'Total Logs',
                  'Verified Logs',
                  'Total KG',
                  'Total Earnings',
                ]}
              >
                {monthlyReport.division_breakdown.map((item, idx) => (
                  <tr key={idx} className="border-b border-wastelink-border hover:bg-gray-50">
                    <td className="table-cell font-medium">{item.division}</td>
                    <td className="table-cell">{formatNumber(item.total_pickers)}</td>
                    <td className="table-cell">{formatNumber(item.total_logs)}</td>
                    <td className="table-cell">{formatNumber(item.verified_logs)}</td>
                    <td className="table-cell">{formatKg(item.total_verified_kg)}</td>
                    <td className="table-cell">{formatCurrencyUGX(item.total_earnings)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}

          {/* Top Pickers */}
          {monthlyReport.top_pickers?.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">
                Top Pickers This Month
              </h4>
              <DataTable
                columns={[
                  'Picker Code',
                  'Name',
                  'Division',
                  'Verified Jobs',
                  'Total KG',
                  'Earnings',
                ]}
              >
                {monthlyReport.top_pickers.map((picker, idx) => (
                  <tr key={idx} className="border-b border-wastelink-border hover:bg-gray-50">
                    <td className="table-cell font-medium text-wastelink-primary">
                      {picker.picker_code}
                    </td>
                    <td className="table-cell">{picker.name}</td>
                    <td className="table-cell text-sm">{picker.division}</td>
                    <td className="table-cell">{formatNumber(picker.verified_jobs)}</td>
                    <td className="table-cell">{formatKg(picker.total_verified_kg)}</td>
                    <td className="table-cell">{formatCurrencyUGX(picker.total_earnings)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}
        </div>
      )}

      {/* UNDP Pilot Report */}
      {undpReport && (
        <div className="space-y-6 border-t border-wastelink-border pt-8">
          <div>
            <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
              UNDP Pilot Report
            </h3>
            <div className="card">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-wastelink-muted text-sm">Pilot City</p>
                  <p className="text-xl font-bold text-wastelink-dark">{undpReport.pilot_city}</p>
                </div>
                <div>
                  <p className="text-wastelink-muted text-sm">Divisions</p>
                  <p className="text-lg font-semibold text-wastelink-dark">
                    {undpReport.pilot_divisions?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Inclusion Metrics */}
          {undpReport.inclusion && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">
                Inclusion Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Registered Pickers"
                  value={formatNumber(undpReport.inclusion.registered_pickers)}
                />
                <StatCard
                  title="Women Pickers"
                  value={`${formatNumber(undpReport.inclusion.women_pickers)} (${formatPercentage(
                    undpReport.inclusion.women_percentage
                  )})`}
                />
                <StatCard
                  title="Youth Pickers"
                  value={`${formatNumber(undpReport.inclusion.youth_pickers)} (${formatPercentage(
                    undpReport.inclusion.youth_percentage
                  )})`}
                />
              </div>
            </div>
          )}

          {/* Environmental Impact */}
          {undpReport.environmental_impact && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">
                Environmental Impact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <StatCard
                  title="Total Estimated (Logged)"
                  value={formatKg(undpReport.environmental_impact.total_estimated_kg)}
                />
                <StatCard
                  title="Total Verified (Agent)"
                  value={formatKg(undpReport.environmental_impact.verified_waste_kg)}
                />
                <StatCard
                  title="Pending / Unverified"
                  value={formatKg(undpReport.environmental_impact.pending_unverified_kg)}
                />
                <StatCard
                  title="Verified Waste (Tonnes)"
                  value={formatTonnes(undpReport.environmental_impact.verified_waste_tonnes)}
                />
                <StatCard
                  title="Rejected Logs"
                  value={formatNumber(undpReport.environmental_impact.rejected_logs || undpReport.operations?.rejected_logs || 0)}
                />
                <StatCard
                  title="Rejected Est. KG"
                  value={formatKg(undpReport.environmental_impact.rejected_estimated_kg || 0)}
                />
              </div>

              {undpReport.environmental_impact.reporting_category_breakdown?.length > 0 && (
                <div className="card mb-4">
                  <h5 className="font-medium text-wastelink-dark mb-3">UNDP Reporting Categories</h5>
                  <DataTable columns={['Category', 'Estimated KG', 'Verified KG', 'Pending KG', 'Rejected KG', 'Paid Earnings']}>
                    {undpReport.environmental_impact.reporting_category_breakdown.map((item, idx) => (
                      <tr key={idx} className="border-b border-wastelink-border">
                        <td className="table-cell font-medium">{item.reporting_category_name}</td>
                        <td className="table-cell">{formatKg(item.estimated_kg || 0)}</td>
                        <td className="table-cell">{formatKg(item.verified_kg)}</td>
                        <td className="table-cell">{formatKg(item.pending_kg || 0)}</td>
                        <td className="table-cell">{formatKg(item.rejected_kg || 0)}</td>
                        <td className="table-cell">{formatCurrencyUGX(item.paid_earnings || 0)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}

              {undpReport.environmental_impact.city_waste_type_breakdown?.length > 0 && (
                <div className="card mb-4">
                  <h5 className="font-medium text-wastelink-dark mb-3">City Waste Type Breakdown</h5>
                  <DataTable columns={['City Waste Type', 'Reporting Category', 'Estimated KG', 'Verified KG', 'Pending KG', 'Earnings']}>
                    {undpReport.environmental_impact.city_waste_type_breakdown.map((item, idx) => (
                      <tr key={idx} className="border-b border-wastelink-border">
                        <td className="table-cell">{item.city_waste_type_name}</td>
                        <td className="table-cell">{item.reporting_category_name}</td>
                        <td className="table-cell">{formatKg(item.estimated_kg || 0)}</td>
                        <td className="table-cell">{formatKg(item.verified_kg)}</td>
                        <td className="table-cell">{formatKg(item.pending_kg || 0)}</td>
                        <td className="table-cell">{formatCurrencyUGX(item.total_earnings || 0)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}

              {undpReport.environmental_impact.waste_type_breakdown?.length > 0 && (
                <div className="card">
                  <h5 className="font-medium text-wastelink-dark mb-3">Waste Types</h5>
                  <DataTable columns={['Waste Type', 'Estimated KG', 'Verified KG', 'Pending KG']}>
                    {undpReport.environmental_impact.waste_type_breakdown.map((item, idx) => (
                      <tr key={idx} className="border-b border-wastelink-border">
                        <td className="table-cell">{formatStatus(item.waste_type)}</td>
                        <td className="table-cell">{formatKg(item.estimated_kg || 0)}</td>
                        <td className="table-cell">{formatKg(item.verified_kg)}</td>
                        <td className="table-cell">{formatKg(item.pending_kg || 0)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}
            </div>
          )}

          {/* Livelihood Impact */}
          {undpReport.livelihood_impact && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">
                Livelihood Impact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  title="Total Earnings"
                  value={formatCurrencyUGX(undpReport.livelihood_impact.total_earnings_generated)}
                />
                <StatCard
                  title="Paid Earnings"
                  value={formatCurrencyUGX(undpReport.livelihood_impact.paid_earnings)}
                />
                <StatCard
                  title="Pending Earnings"
                  value={formatCurrencyUGX(undpReport.livelihood_impact.pending_earnings)}
                />
                <StatCard
                  title="Avg Earning/Picker"
                  value={formatCurrencyUGX(
                    undpReport.livelihood_impact.average_earning_per_picker
                  )}
                />
              </div>
            </div>
          )}

          {/* Operations Metrics */}
          {undpReport.operations && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">
                Operations Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Active Collection Points"
                  value={formatNumber(undpReport.operations.collection_points_active)}
                />
                <StatCard
                  title="Total Waste Logs"
                  value={formatNumber(undpReport.operations.total_waste_logs)}
                />
                <StatCard
                  title="Verified Logs"
                  value={formatNumber(undpReport.operations.verified_logs)}
                />
                <StatCard
                  title="Rejected Logs"
                  value={formatNumber(undpReport.operations.rejected_logs)}
                />
                <StatCard
                  title="Pending Logs"
                  value={formatNumber(undpReport.operations.pending_logs)}
                />
              </div>
            </div>
          )}

          {/* Top Pickers */}
          {undpReport.top_pickers?.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-wastelink-dark mb-3">Top Pickers</h4>
              <DataTable
                columns={[
                  'Picker Code',
                  'Name',
                  'Division',
                  'Verified KG',
                  'Earnings',
                ]}
              >
                {undpReport.top_pickers.map((picker, idx) => (
                  <tr key={idx} className="border-b border-wastelink-border hover:bg-gray-50">
                    <td className="table-cell font-medium text-wastelink-primary">
                      {picker.picker_code}
                    </td>
                    <td className="table-cell">{picker.name}</td>
                    <td className="table-cell text-sm">{picker.division}</td>
                    <td className="table-cell">{formatKg(picker.verified_kg)}</td>
                    <td className="table-cell">{formatCurrencyUGX(picker.total_earnings)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import {
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
  Button,
  Modal,
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
import { getAuthUser, normalizeRole } from '../utils/auth';
import { resolveAppCity } from '../utils/city';
import { useCities } from '../hooks/useCities';

export default function Reports() {
  const authUser = getAuthUser();
  const isSuperAdmin = normalizeRole(authUser?.role) === 'SUPER_ADMIN';
  const { defaultCity } = useCities({ pilotOnly: true });
  const actorCity = authUser?.city ? String(authUser.city).trim().toLowerCase() : defaultCity;

  const [monthlyReport, setMonthlyReport] = useState(null);
  const [summaryReport, setSummaryReport] = useState(null);
  const [undpReport, setUndpReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportMeta, setExportMeta] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [exportPreview, setExportPreview] = useState(null);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
  const [emptyExportModal, setEmptyExportModal] = useState(null);

  const [monthFilter, setMonthFilter] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [undpStartDate, setUndpStartDate] = useState('');
  const [undpEndDate, setUndpEndDate] = useState('');
  const [customDateMode, setCustomDateMode] = useState(false);

  const [cityFilter, setCityFilter] = useState(isSuperAdmin ? defaultCity : actorCity);

  useEffect(() => {
    if (isSuperAdmin && defaultCity && !cityFilter) {
      setCityFilter(defaultCity);
    }
  }, [isSuperAdmin, defaultCity, cityFilter]);
  const [collectionPointId, setCollectionPointId] = useState('');
  const [wasteTypeId, setWasteTypeId] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [youthOnly, setYouthOnly] = useState(false);

  const activeCity = isSuperAdmin ? cityFilter : actorCity;

  const exportParams = useMemo(() => {
    const params = { city: activeCity };
    if (customDateMode && undpStartDate && undpEndDate) {
      params.start_date = undpStartDate;
      params.end_date = undpEndDate;
    } else if (monthFilter) {
      params.month = monthFilter;
    }
    if (collectionPointId) params.collection_point_id = collectionPointId;
    if (wasteTypeId) params.city_waste_type_id = wasteTypeId;
    if (genderFilter) params.gender = genderFilter;
    if (youthOnly) params.youth_only = 'true';
    return params;
  }, [
    activeCity,
    customDateMode,
    undpStartDate,
    undpEndDate,
    monthFilter,
    collectionPointId,
    wasteTypeId,
    genderFilter,
    youthOnly,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    loadExportMeta(activeCity);
  }, [activeCity]);

  useEffect(() => {
    loadExportPreview();
  }, [exportParams]);

  const loadExportPreview = async () => {
    try {
      setExportPreviewLoading(true);
      const res = await api.get('/reports/export/preview', { params: exportParams });
      setExportPreview(res.data?.data || null);
    } catch (err) {
      setExportPreview(null);
    } finally {
      setExportPreviewLoading(false);
    }
  };

  const loadExportMeta = async (city) => {
    try {
      const res = await api.get('/reports/export/meta', { params: { city } });
      setExportMeta(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load export metadata', err);
    }
  };

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

  const runDownload = async (format) => {
    try {
      setExportLoading(true);
      setExportError(null);
      setExportMenuOpen(false);

      const endpoint = format === 'xlsx' ? '/reports/export/xlsx' : '/reports/export/pdf';
      const res = await api.get(endpoint, {
        params: exportParams,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type:
          format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename =
        res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] ||
        `WasteLink-report.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setEmptyExportModal(null);
    } catch (err) {
      setExportError(err);
    } finally {
      setExportLoading(false);
    }
  };

  const requestDownload = async (format) => {
    setExportMenuOpen(false);

    try {
      setExportLoading(true);
      const res = await api.get('/reports/export/preview', { params: exportParams });
      const preview = res.data?.data;

      if (preview?.has_activity) {
        await runDownload(format);
        return;
      }

      setEmptyExportModal({ format, preview });
    } catch (err) {
      setExportError(err);
    } finally {
      setExportLoading(false);
    }
  };

  const downloadReport = requestDownload;

  const cityOptions = exportMeta?.cities?.length
    ? exportMeta.cities
    : [activeCity];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchReports} />;

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="card space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-wastelink-dark">City Reports</h2>
            <p className="text-sm text-wastelink-muted mt-1">
              Monthly city report and UNDP pilot impact data for {activeCity}.
              {exportPreview?.pilot_started_date && (
                <span className="block mt-1">
                  Pilot activity started: {new Date(exportPreview.pilot_started_date).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>

          <div className="relative" ref={exportMenuRef}>
            <Button
              onClick={() => setExportMenuOpen((open) => !open)}
              disabled={exportLoading}
              className="inline-flex items-center gap-2"
            >
              <Download size={16} />
              {exportLoading ? 'Preparing…' : 'Download Report Pack'}
              <ChevronDown size={16} />
            </Button>

            {exportMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-wastelink-border bg-white shadow-lg">
                <button
                  type="button"
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
                  onClick={() => downloadReport('xlsx')}
                >
                  <span className="font-medium text-wastelink-dark">Excel Workbook (.xlsx)</span>
                  <span className="mt-1 block text-xs text-wastelink-muted">
                    Full working report for admins
                  </span>
                </button>
                <button
                  type="button"
                  className="block w-full border-t border-wastelink-border px-4 py-3 text-left text-sm hover:bg-gray-50"
                  onClick={() => downloadReport('pdf')}
                >
                  <span className="font-medium text-wastelink-dark">PDF Summary (.pdf)</span>
                  <span className="mt-1 block text-xs text-wastelink-muted">
                    Branded report for UNDP and partners
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {exportError && (
          <p className="text-sm text-red-600">
            Export failed. Check your filters and try again.
          </p>
        )}

        {!exportPreviewLoading && exportPreview && !exportPreview.has_activity && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">No activity found for this period</p>
            <p className="mt-1">
              {exportPreview.message}
              {exportPreview.pilot_started_date && exportPreview.period_before_pilot && (
                <span>
                  {' '}
                  Try selecting a month on or after{' '}
                  {new Date(exportPreview.pilot_started_date).toLocaleDateString()}.
                </span>
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">
                City / Municipality
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              >
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Report Month
            </label>
            <input
              type="month"
              value={monthFilter}
              onChange={handleMonthChange}
              disabled={customDateMode}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Collection Point
            </label>
            <select
              value={collectionPointId}
              onChange={(e) => setCollectionPointId(e.target.value)}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              <option value="">All collection points</option>
              {(exportMeta?.filter_options?.collection_points || []).map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Waste Type
            </label>
            <select
              value={wasteTypeId}
              onChange={(e) => setWasteTypeId(e.target.value)}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              <option value="">All waste types</option>
              {(exportMeta?.filter_options?.waste_types || []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Gender
            </label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              <option value="">All genders</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={youthOnly}
                onChange={(e) => setYouthOnly(e.target.checked)}
                className="border border-wastelink-border rounded"
              />
              <span className="text-sm font-medium text-wastelink-dark">
                Youth pickers only
              </span>
            </label>
          </div>
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
              Use custom date range for UNDP report and exports
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

      <Modal
        isOpen={Boolean(emptyExportModal)}
        onClose={() => setEmptyExportModal(null)}
        title="No activity for this period"
        size="md"
      >
        {emptyExportModal && (
          <div className="space-y-4 text-sm">
            <p className="text-wastelink-dark">
              {emptyExportModal.preview?.message ||
                'No waste logs match your selected period and filters.'}
            </p>
            {emptyExportModal.preview?.pilot_started_date && (
              <p className="text-wastelink-muted">
                Pilot activity for {emptyExportModal.preview.city_label} started on{' '}
                {new Date(emptyExportModal.preview.pilot_started_date).toLocaleDateString()}.
              </p>
            )}
            <p className="text-wastelink-muted">
              The exported file will contain empty tables and zero totals. Choose a month with
              logged waste if you need a report for UNDP or municipality sharing.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEmptyExportModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => runDownload(emptyExportModal.format)}
                disabled={exportLoading}
              >
                Download empty report anyway
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

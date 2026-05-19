import { useEffect, useState } from 'react';
import {
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
} from '../components';
import { formatNumber, formatKg, formatCurrencyUGX } from '../utils/formatters';
import api from '../api/axios';
import { TrendingUp, Users, Zap } from 'lucide-react';

export default function Divisions() {
  const [divisions, setDivisions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [divisionsRes, summaryRes] = await Promise.all([
        api.get('/dashboard/divisions'),
        api.get('/reports/summary'),
      ]);

      setDivisions(divisionsRes.data.data || []);
      setSummary(summaryRes.data.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  // Calculate best performing division
  const bestDivision = divisions.reduce((best, current) => {
    return (current.total_verified_kg || 0) > (best.total_verified_kg || 0)
      ? current
      : best;
  }, divisions[0] || {});

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Divisions Covered"
          value={formatNumber(divisions.length)}
          subtitle={`in Kampala pilot`}
          icon={Users}
        />
        <StatCard
          title="Best Division"
          value={bestDivision.division || '-'}
          subtitle={formatKg(bestDivision.total_verified_kg || 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Verified Waste"
          value={formatKg(summary?.total_verified_kg || 0)}
          subtitle={`across all divisions`}
          icon={Zap}
        />
      </div>

      {/* Division Performance Table */}
      <div>
        <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
          Division Performance
        </h3>
        {divisions.length === 0 ? (
          <EmptyState message="No divisions data available" />
        ) : (
          <DataTable
            columns={[
              'Division',
              'Total Pickers',
              'Active Pickers',
              'Collection Points',
              'Total Logs',
              'Pending',
              'Verified',
              'Rejected',
              'Paid',
              'Total KG',
              'Total Earnings',
            ]}
          >
            {divisions.map((division, idx) => (
              <tr key={idx} className="border-b border-wastelink-border hover:bg-gray-50">
                <td className="table-cell font-semibold text-wastelink-primary">
                  {division.division}
                </td>
                <td className="table-cell">{formatNumber(division.total_pickers)}</td>
                <td className="table-cell">{formatNumber(division.active_pickers)}</td>
                <td className="table-cell">{formatNumber(division.collection_points)}</td>
                <td className="table-cell">{formatNumber(division.total_logs)}</td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                    {formatNumber(division.pending_logs)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    {formatNumber(division.verified_logs)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    {formatNumber(division.rejected_logs)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {formatNumber(division.paid_logs)}
                  </span>
                </td>
                <td className="table-cell font-medium">
                  {formatKg(division.total_verified_kg)}
                </td>
                <td className="table-cell font-medium">
                  {formatCurrencyUGX(division.total_earnings)}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </div>
  );
}

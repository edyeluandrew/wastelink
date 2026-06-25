import { useEffect, useState } from 'react';
import {
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
} from '../components';
import {
  formatCurrencyUGX,
  formatKg,
  formatPercentage,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../utils/formatters';
import api from '../api/axios';
import {
  Users,
  Zap,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [topPickers, setTopPickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, todayRes, logsRes, typesRes, pickersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/today'),
        api.get('/dashboard/recent-logs?limit=5'),
        api.get('/dashboard/waste-types'),
        api.get('/dashboard/top-pickers?limit=5'),
      ]);

      setStats(statsRes.data.data);
      setToday(todayRes.data.data);
      setRecentLogs(logsRes.data.data || []);
      setWasteTypes(typesRes.data.data || []);
      setTopPickers(pickersRes.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const logsSubmitted = today?.logs_submitted ?? today?.logs_today ?? 0;
  const logsVerified = today?.logs_verified ?? today?.verified_today ?? 0;
  const weightToday = today?.weight_today ?? today?.verified_kg_today ?? 0;
  const earningsToday = today?.earnings_today ?? 0;

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
        <StatCard
          title="Total Pickers"
          shortTitle="Pickers"
          value={formatNumber(stats?.total_pickers || 0)}
          subtitle={`${stats?.active_pickers || 0} active`}
          icon={Users}
        />
        <StatCard
          title="Active Collection Points"
          shortTitle="Points"
          value={formatNumber(stats?.active_collection_points || 0)}
          subtitle={`${stats?.total_collection_points || 0} total`}
          icon={MapPin}
        />
        <StatCard
          title="Total Verified Waste"
          shortTitle="Waste"
          value={formatKg(stats?.total_verified_kg || 0)}
          subtitle={`${formatNumber(stats?.total_verified_jobs || 0)} verified jobs`}
          icon={TrendingUp}
        />
        <StatCard
          title="Women Participation"
          value={formatPercentage(stats?.women_percentage || 0)}
          subtitle={`${stats?.women_pickers || 0} women pickers`}
        />
        <StatCard
          title="Youth Participation"
          value={formatPercentage(stats?.youth_percentage || 0)}
          subtitle={`${stats?.youth_pickers || 0} youth pickers`}
        />
        <StatCard
          title="Pending Logs"
          value={formatNumber(stats?.pending_logs || 0)}
          subtitle="Awaiting verification"
          icon={Clock}
        />
        <StatCard
          title="Verified Logs"
          value={formatNumber(stats?.verified_logs || 0)}
          subtitle="This period"
          icon={CheckCircle}
        />
        <StatCard
          title="Rejected Logs"
          value={formatNumber(stats?.rejected_logs || 0)}
          subtitle="Failed verification"
          icon={AlertCircle}
        />
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-wastelink-dark mb-1">Picker Livelihood Summary</h3>
        <p className="text-sm text-wastelink-muted mb-4">
          Verified earnings stay fixed; withdrawals and withdrawable balance split across all jobs.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
          <StatCard
            title="Total Earned"
            shortTitle="Earned"
            value={formatCurrencyUGX(stats?.total_earned ?? stats?.verified_earnings ?? stats?.total_earnings ?? 0)}
            subtitle="Locked when agents verify"
            icon={Zap}
          />
          <StatCard
            title="Total Withdrawn"
            shortTitle="Withdrawn"
            value={formatCurrencyUGX(stats?.total_withdrawn ?? stats?.disbursed_earnings ?? stats?.paid_earnings ?? 0)}
            subtitle="Sent to mobile money"
          />
          <StatCard
            title="Withdrawable Balance"
            shortTitle="Withdrawable"
            value={formatCurrencyUGX(stats?.withdrawable_balance ?? stats?.in_wallet_earnings ?? 0)}
            subtitle="Verified, still in wallet"
          />
        </div>
      </div>

      {/* Today's Activity */}
      {today && (
        <div className="card">
          <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
            Today's Activity
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-wastelink-muted text-sm mb-1">Logs Submitted</p>
              <p className="text-2xl font-bold text-wastelink-dark">
                {logsSubmitted}
              </p>
            </div>
            <div>
              <p className="text-wastelink-muted text-sm mb-1">Logs Verified</p>
              <p className="text-2xl font-bold text-wastelink-dark">
                {logsVerified}
              </p>
            </div>
            <div>
              <p className="text-wastelink-muted text-sm mb-1">Weight Today</p>
              <p className="text-2xl font-bold text-wastelink-dark">
                {formatKg(weightToday)}
              </p>
            </div>
            <div>
              <p className="text-wastelink-muted text-sm mb-1">Verified Earnings Today</p>
              <p className="text-2xl font-bold text-wastelink-dark">
                {formatCurrencyUGX(earningsToday)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div>
        <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
          Recent Waste Logs
        </h3>
        {recentLogs.length === 0 ? (
          <EmptyState message="No waste logs yet" />
        ) : (
          <DataTable
            columns={[
              'Job Code',
              'Picker',
              'Waste Type',
              'Est. KG',
              'Ver. KG',
              'Status',
              'Collection Point',
              'Date',
            ]}
          >
            {recentLogs.map((log) => (
              <tr key={log.id} className="border-b border-wastelink-border hover:bg-gray-50">
                <td className="table-cell font-medium text-wastelink-primary">
                  {log.job_code}
                </td>
                <td className="table-cell">{log.picker_name}</td>
                <td className="table-cell text-sm">{log.waste_type}</td>
                <td className="table-cell">{formatKg(log.estimated_kg)}</td>
                <td className="table-cell">
                  {log.verified_kg ? formatKg(log.verified_kg) : '-'}
                </td>
                <td className="table-cell">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      log.status === 'VERIFIED'
                        ? 'bg-green-100 text-green-800'
                        : log.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="table-cell text-sm">{log.collection_point_name}</td>
                <td className="table-cell text-sm">
                  {formatDate(log.logged_at, true)}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      {/* Waste Types & Top Pickers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Waste Types */}
        <div>
          <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
            Waste Type Breakdown
          </h3>
          {wasteTypes.length === 0 ? (
            <EmptyState message="No waste data yet" />
          ) : (
            <DataTable
              columns={[
                'Waste Type',
                'Total Logs',
                'Verified',
                'Total KG',
                'Verified Earnings',
              ]}
            >
              {wasteTypes.map((type, idx) => (
                <tr key={idx} className="border-b border-wastelink-border hover:bg-gray-50">
                  <td className="table-cell font-medium">{type.waste_type}</td>
                  <td className="table-cell">{type.total_logs}</td>
                  <td className="table-cell">{type.verified_logs}</td>
                  <td className="table-cell">{formatKg(type.total_verified_kg)}</td>
                  <td className="table-cell">
                    {formatCurrencyUGX(type.total_earnings)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        {/* Top Pickers */}
        <div>
          <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
            Top Pickers
          </h3>
          {topPickers.length === 0 ? (
            <EmptyState message="No pickers yet" />
          ) : (
            <DataTable
              columns={[
                'Picker Code',
                'Name',
                'Division',
                'Verified KG',
                'Verified Earnings',
              ]}
            >
              {topPickers.map((picker, idx) => (
                <tr key={idx} className="border-b border-wastelink-border hover:bg-gray-50">
                  <td className="table-cell font-medium text-wastelink-primary">
                    {picker.picker_code}
                  </td>
                  <td className="table-cell">{picker.name}</td>
                  <td className="table-cell text-sm">{picker.division}</td>
                  <td className="table-cell">{formatKg(picker.verified_kg)}</td>
                  <td className="table-cell">
                    {formatCurrencyUGX(picker.total_earnings)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import {
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
  Button,
} from '../components';
import { formatCurrencyUGX, formatKg, formatDateTime, formatStatus } from '../utils/formatters';
import { getEarningAmount, getEarningStatus, hasEarning } from '../utils/earningsHelper';
import api from '../api/axios';

export default function Earnings() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredStatus, setFilteredStatus] = useState('');
  const [markingPaid, setMarkingPaid] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/waste-logs');
      // Filter logs that have earnings
      const logsWithEarnings = (res.data.data || []).filter((log) => hasEarning(log));
      setLogs(logsWithEarnings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (logId) => {
    try {
      setMarkingPaid(logId);
      await api.patch(`/waste-logs/${logId}/mark-paid`);
      alert('Marked as paid');
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setMarkingPaid(null);
    }
  };

  const getFilteredLogs = () => {
    return logs.filter((log) => {
      if (filteredStatus && log.earning_status !== filteredStatus) return false;
      return true;
    });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const filteredLogs = getFilteredLogs();

  // Calculate totals
  const totalEarnings = logs.reduce((sum, log) => sum + (log.amount || 0), 0);
  const totalPaid = logs
    .filter((log) => log.earning_status === 'PAID')
    .reduce((sum, log) => sum + (log.amount || 0), 0);
  const totalPending = logs
    .filter((log) => log.earning_status === 'PENDING')
    .reduce((sum, log) => sum + (log.amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Earnings"
          value={formatCurrencyUGX(totalEarnings)}
          subtitle={`${filteredLogs.length} transactions`}
          icon={DollarSign}
        />
        <StatCard
          title="Paid Earnings"
          value={formatCurrencyUGX(totalPaid)}
          subtitle="Distributed to pickers"
        />
        <StatCard
          title="Pending Earnings"
          value={formatCurrencyUGX(totalPending)}
          subtitle="Awaiting distribution"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-wastelink-dark mb-2">
            Earning Status
          </label>
          <select
            value={filteredStatus}
            onChange={(e) => setFilteredStatus(e.target.value)}
            className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState message="No earnings records found" />
      ) : (
        <DataTable
          columns={[
            'Job Code',
            'Picker',
            'Waste Type',
            'Verified KG',
            'Earning Amount',
            'Earning Status',
            'Waste Log Status',
            'Date',
            'Action',
          ]}
        >
          {filteredLogs.map((log) => (
            <tr key={log.id} className="border-b border-wastelink-border hover:bg-gray-50">
              <td className="table-cell font-medium text-wastelink-primary">{log.job_code}</td>
              <td className="table-cell text-sm">{log.picker_name}</td>
              <td className="table-cell text-sm">{formatStatus(log.waste_type)}</td>
              <td className="table-cell">{formatKg(log.verified_kg || 0)}</td>
              <td className="table-cell font-semibold">
                {formatCurrencyUGX(log.amount)}
              </td>
              <td className="table-cell">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    log.earning_status === 'PAID'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {formatStatus(log.earning_status)}
                </span>
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
                  {formatStatus(log.status)}
                </span>
              </td>
              <td className="table-cell text-xs">{formatDateTime(log.logged_at)}</td>
              <td className="table-cell">
                {log.status === 'VERIFIED' && log.earning_status === 'PENDING' && (
                  <Button
                    onClick={() => handleMarkPaid(log.id)}
                    disabled={markingPaid === log.id}
                    size="sm"
                    className="text-xs"
                  >
                    {markingPaid === log.id ? 'Marking...' : 'Mark Paid'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

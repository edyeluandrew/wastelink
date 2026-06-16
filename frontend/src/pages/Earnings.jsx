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

const PAYOUT_ACTIONS = {
  PENDING: { label: 'Approve Payout', endpoint: 'approve' },
  APPROVED: { label: 'Initiate Payout', endpoint: 'initiate' },
  PAYOUT_INITIATED: { label: 'Simulate Confirm (Demo)', endpoint: 'simulate-confirm' },
};

const statusBadgeClass = (status) => {
  switch (status) {
    case 'PAID':
      return 'bg-blue-100 text-blue-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'PAYOUT_INITIATED':
      return 'bg-purple-100 text-purple-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
};

export default function Earnings() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredStatus, setFilteredStatus] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/waste-logs');
      const logsWithEarnings = (res.data.data || []).filter((log) => hasEarning(log));
      setLogs(logsWithEarnings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutAction = async (log) => {
    const status = getEarningStatus(log);
    const action = PAYOUT_ACTIONS[status];

    if (!action) return;

    const confirmMessage =
      action.endpoint === 'simulate-confirm'
        ? 'Simulate mobile money payout confirmation? This is a DEMO action — no real payment is sent.'
        : `Proceed with "${action.label}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setProcessingId(log.id);
      await api.patch(`/waste-logs/${log.id}/payout/${action.endpoint}`);
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  const getFilteredLogs = () =>
    logs.filter((log) => {
      if (filteredStatus && getEarningStatus(log) !== filteredStatus) return false;
      return true;
    });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const filteredLogs = getFilteredLogs();

  const totalEarnings = logs.reduce((sum, log) => sum + (log.amount || 0), 0);
  const totalPaid = logs
    .filter((log) => getEarningStatus(log) === 'PAID')
    .reduce((sum, log) => sum + (log.amount || 0), 0);
  const totalPending = logs
    .filter((log) => !['PAID', 'FAILED'].includes(getEarningStatus(log)))
    .reduce((sum, log) => sum + (log.amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Payout lifecycle: Pending → Approved → Payout Initiated → Paid. Use
        <strong> Simulate Confirm (Demo)</strong> for MVP — no real mobile money integration.
      </div>

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
          title="Pending Pipeline"
          value={formatCurrencyUGX(totalPending)}
          subtitle="Awaiting payout steps"
        />
      </div>

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
            <option value="APPROVED">Approved</option>
            <option value="PAYOUT_INITIATED">Payout Initiated</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState message="No earnings records found" />
      ) : (
        <DataTable
          columns={[
            'Job Code',
            'Picker',
            'Est. KG',
            'Verified KG',
            'Amount',
            'Payment Status',
            'Log Status',
            'Date',
            'Action',
          ]}
        >
          {filteredLogs.map((log) => {
            const earningStatus = getEarningStatus(log);
            const action = PAYOUT_ACTIONS[earningStatus];

            return (
              <tr key={log.id} className="border-b border-wastelink-border hover:bg-gray-50">
                <td className="table-cell font-medium text-wastelink-primary">{log.job_code}</td>
                <td className="table-cell text-sm">{log.picker_name}</td>
                <td className="table-cell">{formatKg(log.estimated_kg || 0)}</td>
                <td className="table-cell">{formatKg(log.verified_kg || 0)}</td>
                <td className="table-cell font-semibold">{formatCurrencyUGX(getEarningAmount(log))}</td>
                <td className="table-cell">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(earningStatus)}`}>
                    {formatStatus(earningStatus)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {formatStatus(log.status)}
                  </span>
                </td>
                <td className="table-cell text-xs">{formatDateTime(log.logged_at)}</td>
                <td className="table-cell">
                  {action ? (
                    <Button
                      onClick={() => handlePayoutAction(log)}
                      disabled={processingId === log.id}
                      size="sm"
                      className="text-xs"
                    >
                      {processingId === log.id ? 'Processing...' : action.label}
                    </Button>
                  ) : (
                    <span className="text-xs text-wastelink-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}

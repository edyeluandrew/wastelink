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
import { getEarningAmount, getEarningStatus, getWalletAmount, getWithdrawnAmount, hasEarning, normalizeEarningStatus, sumSuccessfulWithdrawals, sumProcessingWithdrawals } from '../utils/earningsHelper';
import api from '../api/axios';

const EARNING_ACTIONS = {
  PAYOUT_PROCESSING: [
    { label: 'Simulate Confirm', endpoint: 'simulate-confirm', variant: 'primary' },
    { label: 'Simulate Fail', endpoint: 'simulate-fail', variant: 'danger' },
  ],
  FAILED: [
    { label: 'Retry', endpoint: 'retry', variant: 'primary' },
    { label: 'Return to Balance', endpoint: 'return-to-balance', variant: 'secondary' },
  ],
};

const WITHDRAWAL_ACTIONS = {
  PROCESSING: [
    { label: 'Simulate Confirm', action: 'simulate-confirm' },
    { label: 'Simulate Fail', action: 'simulate-fail' },
  ],
  FAILED: [
    { label: 'Retry', action: 'retry' },
    { label: 'Return to Balance', action: 'return-to-balance' },
  ],
};

const statusBadgeClass = (status) => {
  switch (normalizeEarningStatus(status)) {
    case 'PAID':
      return 'bg-blue-100 text-blue-800';
    case 'AVAILABLE':
      return 'bg-green-100 text-green-800';
    case 'PAYOUT_PROCESSING':
      return 'bg-purple-100 text-purple-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
};

export default function Earnings() {
  const [logs, setLogs] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredStatus, setFilteredStatus] = useState('');
  const [processingKey, setProcessingKey] = useState(null);
  const [activeTab, setActiveTab] = useState('earnings');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logsRes, withdrawalsRes] = await Promise.all([
        api.get('/waste-logs'),
        api.get('/withdrawals?all=true'),
      ]);
      const logsWithEarnings = (logsRes.data.data || []).filter((log) => hasEarning(log));
      setLogs(logsWithEarnings);
      setWithdrawals(withdrawalsRes.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEarningAction = async (log, endpoint) => {
    const confirmMessage =
      endpoint === 'simulate-confirm'
        ? 'Simulate provider payment success? (Demo — no real transfer)'
        : endpoint === 'simulate-fail'
          ? 'Simulate provider payment failure?'
          : `Proceed with "${endpoint.replace(/-/g, ' ')}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setProcessingKey(`earning-${log.id}`);
      await api.patch(`/waste-logs/${log.id}/payout/${endpoint}`);
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessingKey(null);
    }
  };

  const handleWithdrawalAction = async (withdrawal, action) => {
    if (!window.confirm(`Proceed with "${action.replace(/-/g, ' ')}" for withdrawal #${withdrawal.id}?`)) return;

    try {
      setProcessingKey(`withdrawal-${withdrawal.id}`);
      await api.patch(`/withdrawals/${withdrawal.id}/${action}`);
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessingKey(null);
    }
  };

  const getFilteredLogs = () =>
    logs.filter((log) => {
      if (!filteredStatus) return true;
      return normalizeEarningStatus(getEarningStatus(log)) === filteredStatus;
    });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const filteredLogs = getFilteredLogs();

  const totalVerified = logs.reduce((sum, log) => sum + getEarningAmount(log), 0);
  const totalWithdrawn = sumSuccessfulWithdrawals(withdrawals);
  const totalAvailable = logs
    .filter((log) => normalizeEarningStatus(getEarningStatus(log)) === 'AVAILABLE')
    .reduce((sum, log) => sum + getWalletAmount(log), 0);
  const totalProcessing = sumProcessingWithdrawals(withdrawals);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        Agent verification creates withdrawable earnings — no admin approval required.
        Admin monitors payouts and can simulate provider confirm/fail during demo.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Verified Earnings" value={formatCurrencyUGX(totalVerified)} subtitle="Locked at agent verify" icon={DollarSign} />
        <StatCard title="Disbursed (Withdrawn)" value={formatCurrencyUGX(totalWithdrawn)} subtitle="Successful withdrawals" />
        <StatCard title="In Wallet" value={formatCurrencyUGX(totalAvailable)} subtitle="Available to withdraw" />
        <StatCard title="Processing Payouts" value={formatCurrencyUGX(totalProcessing)} subtitle="In-flight withdrawals" />
      </div>

      <div className="flex gap-2 border-b border-wastelink-border">
        <button
          type="button"
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'earnings' ? 'border-wastelink-primary text-wastelink-primary' : 'border-transparent text-wastelink-muted'}`}
        >
          Earnings by Job
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'withdrawals' ? 'border-wastelink-primary text-wastelink-primary' : 'border-transparent text-wastelink-muted'}`}
        >
          Withdrawal Requests
        </button>
      </div>

      {activeTab === 'earnings' && (
        <>
          <div className="card max-w-xs">
            <label className="block text-sm font-medium text-wastelink-dark mb-2">Earning Status</label>
            <select
              value={filteredStatus}
              onChange={(e) => setFilteredStatus(e.target.value)}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="PAYOUT_PROCESSING">Payout Processing</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState message="No earnings records found" />
          ) : (
            <DataTable
              columns={['Job Code', 'Picker', 'Verified KG', 'Earned', 'Withdrawn', 'In Wallet', 'Payment Status', 'Log Status', 'Date', 'Action']}
            >
              {filteredLogs.map((log) => {
                const earningStatus = normalizeEarningStatus(getEarningStatus(log));
                const actions = EARNING_ACTIONS[earningStatus] || [];

                return (
                  <tr key={log.id} className="border-b border-wastelink-border hover:bg-gray-50">
                    <td className="table-cell font-medium text-wastelink-primary">{log.job_code}</td>
                    <td className="table-cell text-sm">{log.picker_name}</td>
                    <td className="table-cell">{formatKg(log.verified_kg || 0)}</td>
                    <td className="table-cell font-semibold">{formatCurrencyUGX(getEarningAmount(log))}</td>
                    <td className="table-cell">{formatCurrencyUGX(getWithdrawnAmount(log))}</td>
                    <td className="table-cell">{formatCurrencyUGX(getWalletAmount(log))}</td>
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
                      {actions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {actions.map((action) => (
                            <Button
                              key={action.endpoint}
                              onClick={() => handleEarningAction(log, action.endpoint)}
                              disabled={processingKey === `earning-${log.id}`}
                              size="sm"
                              className="text-xs"
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-wastelink-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </>
      )}

      {activeTab === 'withdrawals' && (
        withdrawals.length === 0 ? (
          <EmptyState message="No withdrawal requests yet" />
        ) : (
          <DataTable columns={['ID', 'Picker', 'Provider', 'Amount', 'Status', 'Reference', 'Date', 'Actions']}>
            {withdrawals.map((item) => {
              const actions = WITHDRAWAL_ACTIONS[item.status] || [];
              return (
                <tr key={item.id} className="border-b border-wastelink-border">
                  <td className="table-cell">#{item.id}</td>
                  <td className="table-cell">{item.picker_name}</td>
                  <td className="table-cell">{item.provider}</td>
                  <td className="table-cell font-semibold">{formatCurrencyUGX(item.amount)}</td>
                  <td className="table-cell">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(item.status === 'PROCESSING' ? 'PAYOUT_PROCESSING' : item.status === 'SUCCESS' ? 'PAID' : item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="table-cell text-xs font-mono">{item.payment_reference || '—'}</td>
                  <td className="table-cell text-xs">{formatDateTime(item.created_at)}</td>
                  <td className="table-cell">
                    {actions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {actions.map((action) => (
                          <Button
                            key={action.action}
                            size="sm"
                            onClick={() => handleWithdrawalAction(item, action.action)}
                            disabled={processingKey === `withdrawal-${item.id}`}
                            className="text-xs"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-wastelink-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )
      )}
    </div>
  );
}

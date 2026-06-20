import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState, StatusBadge, Button, Modal } from '../../components';
import apiClient from '../../api/axios';
import { getCurrentPicker, getCurrentPickerId } from '../utils/pickerSession';
import { formatUGX, formatDate, formatDateTime } from '../../utils/formatters';
import { Wallet, Scale, CreditCard, Hourglass, TrendingUp, Smartphone, ShieldAlert } from 'lucide-react';
import { getEarningAmount, getEarningStatus, sumSuccessfulWithdrawals, sumProcessingWithdrawals } from '../../utils/earningsHelper';
import MobileMoneyProviderIcon from '../components/MobileMoneyProviderIcon';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

const PROVIDERS = [
  { id: 'MTN', label: 'MTN Mobile Money', hint: '077, 078, 076, 039' },
  { id: 'AIRTEL', label: 'Airtel Money', hint: '070, 075, 074, 020' },
];

export default function MyEarnings() {
  const navigate = useNavigate();
  const picker = getCurrentPicker();
  const pickerId = getCurrentPickerId();

  const [earnings, setEarnings] = useState(null);
  const [balance, setBalance] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);
  const [provider, setProvider] = useState('MTN');
  const [phone, setPhone] = useState(picker?.phone || '');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (!pickerId) {
      navigate(AUTH_ENFORCED ? '/login' : '/picker/start', { replace: true });
      return;
    }

    fetchEarnings();
  }, [pickerId, navigate]);

  const fetchEarnings = async () => {
    if (!pickerId) return;

    setLoading(true);
    setError(null);

    try {
      const [logsRes, balanceRes, withdrawalsRes] = await Promise.all([
        apiClient.get(`/waste-logs?picker_id=${pickerId}`),
        apiClient.get('/withdrawals/balance'),
        apiClient.get('/withdrawals'),
      ]);

      if (logsRes.data?.success) {
        const allJobs = logsRes.data.data || [];
        const verified = allJobs.filter(j => j.status === 'VERIFIED' || j.status === 'PAID');
        const withdrawalList = withdrawalsRes.data?.success ? (withdrawalsRes.data.data || []) : [];
        const pendingVerification = allJobs.filter(j => j.status === 'PENDING').length;
        const paidEarnings = sumSuccessfulWithdrawals(withdrawalList);
        const processingEarnings = sumProcessingWithdrawals(withdrawalList);
        const totalKg = verified.reduce((sum, j) => sum + (j.verified_kg || 0), 0);
        const paidJobs = allJobs.filter(j => j.status === 'PAID').length;

        setEarnings({
          pendingVerification,
          paid: paidEarnings,
          processing: processingEarnings,
          totalKg,
          paidJobs,
        });

        const earningJobs = verified
          .filter(j => getEarningAmount(j) > 0)
          .sort((a, b) => new Date(b.verified_at || b.logged_at) - new Date(a.verified_at || a.logged_at));
        setJobs(earningJobs);
      }

      if (balanceRes.data?.success) {
        setBalance(balanceRes.data.data);
      }

      if (withdrawalsRes.data?.success) {
        setWithdrawals(withdrawalsRes.data.data || []);
      }
    } catch (err) {
      console.error('[MyEarnings] Error:', err);
      setError(err.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!phone.trim()) {
      setWithdrawError('Enter your mobile money number');
      return;
    }

    const parsedAmount = parseInt(String(withdrawAmount).replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setWithdrawError('Enter a valid withdrawal amount');
      return;
    }

    if (parsedAmount > availableToWithdraw) {
      setWithdrawError(`Amount cannot exceed ${formatUGX(availableToWithdraw)}`);
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);

    try {
      const response = await apiClient.post('/withdrawals', {
        provider,
        phone: phone.trim(),
        amount: parsedAmount,
      });

      if (response.data?.success) {
        setWithdrawSuccess(response.data.data);
        setWithdrawOpen(false);
        await fetchEarnings();
      } else {
        setWithdrawError(response.data?.message || 'Withdrawal failed');
      }
    } catch (err) {
      setWithdrawError(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your earnings..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchEarnings} />;
  }

  if (!earnings) {
    return <EmptyState title="No verified earnings yet" message="Log waste and wait for agent verification." icon={Wallet} />;
  }

  const averageEarning = earnings.totalKg > 0 && jobs.length > 0
    ? jobs.reduce((sum, j) => sum + getEarningAmount(j), 0) / jobs.length
    : 0;
  const availableToWithdraw = balance?.available_balance ?? balance?.available_to_withdraw ?? 0;
  const payoutProcessing = balance?.payout_processing_balance ?? earnings.processing ?? 0;
  const totalPaid = balance?.total_paid ?? earnings.paid ?? 0;
  const failedBalance = balance?.failed_balance ?? 0;
  const pendingVerification = balance?.pending_logs_count ?? earnings.pendingVerification ?? 0;
  const pendingEstimated = balance?.pending_estimated_total ?? 0;
  const canWithdraw = availableToWithdraw > 0;
  const parsedWithdrawAmount = parseInt(String(withdrawAmount).replace(/[^\d]/g, ''), 10) || 0;
  const isValidWithdrawAmount =
    parsedWithdrawAmount > 0 && parsedWithdrawAmount <= availableToWithdraw;

  const openWithdrawModal = () => {
    setWithdrawError(null);
    setWithdrawAmount(String(availableToWithdraw));
    setWithdrawOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Financial Overview</p>
          <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>My Earnings</h1>
          <p className="text-sm text-[#6B7280]">Track income and withdraw to mobile money.</p>
        </div>
        <button
          onClick={() => navigate('/picker/dashboard')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Mobile Money Withdrawal Card */}
      <div className="rounded-3xl border border-[#FFD966] bg-[linear-gradient(135deg,#FFF9E6_0%,#FFFFFF_75%)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              <Smartphone size={14} /> Available to Withdraw
            </p>
            <p className="mt-2 text-4xl font-bold text-[#111111]">{formatUGX(availableToWithdraw)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Available after agent verification — withdraw anytime
            </p>
          </div>
          <Button
            onClick={openWithdrawModal}
            disabled={!canWithdraw}
            className="w-full bg-[#111111] text-white hover:bg-[#238636] md:w-auto"
          >
            Withdraw to Mobile Money
          </Button>
        </div>

        {payoutProcessing > 0 && (
          <p className="mt-3 rounded-2xl bg-white/80 p-3 text-sm text-[#6B7280]">
            {formatUGX(payoutProcessing)} is being processed to your mobile money.
          </p>
        )}
      </div>

      {withdrawSuccess && (
        <div className="rounded-3xl border border-[#BDE5BF] bg-[#EAF6EA] p-5">
          <p className="text-lg font-bold text-[#238636]">Withdrawal submitted</p>
          <p className="mt-1 text-sm text-[#111111]">{withdrawSuccess.demo_notice}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs text-[#6B7280]">Provider</p>
              <div className="mt-1 flex items-center gap-2">
                <MobileMoneyProviderIcon provider={withdrawSuccess.withdrawal?.provider} size="sm" />
                <p className="font-semibold">{withdrawSuccess.withdrawal?.provider_label}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-xs text-[#6B7280]">Amount</p>
              <p className="font-semibold">{formatUGX(withdrawSuccess.withdrawal?.amount)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3 md:col-span-2">
              <p className="text-xs text-[#6B7280]">Reference</p>
              <p className="font-mono font-semibold">{withdrawSuccess.withdrawal?.payment_reference}</p>
            </div>
          </div>
          <button
            onClick={() => setWithdrawSuccess(null)}
            className="mt-3 text-sm font-semibold text-[#238636] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_70%)] p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Pending Verification</p>
            <p className="mt-2 text-3xl font-bold text-[#B45309]">{pendingVerification}</p>
            <p className="mt-1 text-sm text-[#6B7280]">Jobs awaiting agent</p>
            {pendingEstimated > 0 && (
              <p className="mt-2 text-sm font-semibold text-amber-700">Est. ~{formatUGX(pendingEstimated)}</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Withdrawable Balance</p>
            <p className="mt-2 text-3xl font-bold text-[#111111]">{formatUGX(availableToWithdraw)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">Ready to withdraw</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Payout Processing</p>
            <p className="mt-2 text-3xl font-bold text-[#7C3AED]">{formatUGX(payoutProcessing)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">In-flight to mobile money</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Total Paid</p>
            <p className="mt-2 text-3xl font-bold text-[#238636]">{formatUGX(totalPaid)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{earnings.paidJobs} completed jobs</p>
          </div>
        </div>
        {failedBalance > 0 && (
          <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {formatUGX(failedBalance)} in failed payouts — contact support or retry from admin.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"><Scale size={14} /> Verified KG</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{earnings.totalKg} kg</p>
        </div>
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"><CreditCard size={14} /> Paid Jobs</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{earnings.paidJobs}</p>
        </div>
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"><Hourglass size={14} /> Pending Verification</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{pendingVerification}</p>
        </div>
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"><TrendingUp size={14} /> Average / Job</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{formatUGX(averageEarning)}</p>
        </div>
      </div>

      {withdrawals.length > 0 && (
        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#111111]">Withdrawal History</h2>
          <p className="mb-4 text-sm text-[#6B7280]">Simulated mobile money transfers to your phone.</p>
          <div className="space-y-3">
            {withdrawals.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <MobileMoneyProviderIcon provider={item.provider} size="sm" />
                    <div>
                      <p className="font-bold text-[#111111]">{item.provider === 'MTN' ? 'MTN Mobile Money' : 'Airtel Money'}</p>
                      <p className="text-sm text-[#6B7280]">{item.phone} · {item.jobs_count} job(s)</p>
                      <p className="mt-1 font-mono text-xs text-[#6B7280]">{item.payment_reference}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#238636]">{formatUGX(item.amount)}</p>
                    <StatusBadge status={item.status} />
                    <p className="mt-1 text-xs text-[#6B7280]">{formatDateTime(item.completed_at || item.created_at)}</p>
                  </div>
                </div>
                {item.is_simulated && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                    <ShieldAlert size={12} /> Demo — no real transfer
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs.length > 0 ? (
        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111111]">Earnings History</h2>
            <p className="text-sm text-[#6B7280]">Each verified job that generated income.</p>
          </div>

          <div className="space-y-3">
            {jobs.map(job => {
              const amount = getEarningAmount(job);
              const status = getEarningStatus(job);

              return (
                <div key={job.id} className="rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Job Code</p>
                      <p className="text-lg font-bold text-[#111111]">{job.job_code}</p>
                      <p className="text-sm text-[#6B7280]">{job.waste_type}</p>
                    </div>
                    <StatusBadge status={status === 'NONE' ? job.status : status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Verified KG</p>
                      <p className="mt-1 text-base font-bold text-[#111111]">{job.verified_kg || 0} kg</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Amount</p>
                      <p className="mt-1 text-base font-bold text-[#111111]">{formatUGX(amount)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Payment Status</p>
                      <p className="mt-1 text-base font-bold text-[#111111]">{status}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Date</p>
                      <p className="mt-1 text-base font-bold text-[#111111]">{formatDate(job.verified_at || job.logged_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No verified earnings yet"
          message="Log waste and wait for agent verification."
          icon={Wallet}
        />
      )}

      <Modal
        isOpen={withdrawOpen}
        title="Withdraw to Mobile Money (Demo)"
        onClose={() => !withdrawing && setWithdrawOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This is a <strong>simulated</strong> withdrawal for the UNDP demo. No real MTN or Airtel transfer will be made.
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">Amount to withdraw (UGX)</p>
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(availableToWithdraw))}
                className="text-xs font-semibold text-[#238636] hover:underline"
                disabled={withdrawing}
              >
                Withdraw all
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Enter amount"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-bold text-[#111111] focus:border-[#238636] focus:outline-none"
              disabled={withdrawing}
            />
            <p className="mt-2 text-sm text-gray-500">
              Available: <span className="font-semibold text-[#238636]">{formatUGX(availableToWithdraw)}</span>
              {parsedWithdrawAmount > 0 && parsedWithdrawAmount < availableToWithdraw && (
                <span className="ml-2 text-amber-700">· Partial withdrawal</span>
              )}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Mobile Money Provider</p>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProvider(item.id)}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    provider === item.id ? 'border-[#238636] ring-2 ring-[#238636]/20' : 'border-gray-200'
                  }`}
                >
                  <MobileMoneyProviderIcon provider={item.id} size="sm" showLabel />
                  <p className="text-xs text-gray-500 mt-2">{item.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Mobile Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0779305759"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
              disabled={withdrawing}
            />
          </div>

          {withdrawError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{withdrawError}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleWithdraw}
              disabled={withdrawing || !canWithdraw || !isValidWithdrawAmount}
              className="flex-1 bg-[#238636] text-white hover:bg-[#2F9E44]"
            >
              {withdrawing
                ? 'Processing...'
                : `Send ${parsedWithdrawAmount > 0 ? formatUGX(parsedWithdrawAmount) : ''} to ${provider === 'MTN' ? 'MTN MoMo' : 'Airtel Money'}`}
            </Button>
            <Button
              onClick={() => setWithdrawOpen(false)}
              disabled={withdrawing}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../../components';
import apiClient from '../../api/axios';
import { getCurrentPickerId } from '../utils/pickerSession';
import { formatUGX, formatDate } from '../../utils/formatters';
import { Wallet, Scale, CreditCard, Hourglass, TrendingUp } from 'lucide-react';
import { getEarningAmount, getEarningStatus } from '../../utils/earningsHelper';
import { getVerifiedKg } from '../../utils/wasteLogHelpers';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

export default function MyEarnings() {
  const navigate = useNavigate();
  const pickerId = getCurrentPickerId();

  const [earnings, setEarnings] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const response = await apiClient.get(`/waste-logs?picker_id=${pickerId}`);
      
      if (response.data?.success) {
        const allJobs = response.data.data || [];
        
        // Calculate earnings
        const verified = allJobs.filter(j => j.status === 'VERIFIED' || j.status === 'PAID');
        const totalEarnings = verified.reduce((sum, j) => sum + getEarningAmount(j), 0);
        const paidEarnings = allJobs
          .filter(j => getEarningStatus(j) === 'PAID')
          .reduce((sum, j) => sum + getEarningAmount(j), 0);
        const pendingEarnings = allJobs
          .filter(j => getEarningStatus(j) === 'PENDING')
          .reduce((sum, j) => sum + getEarningAmount(j), 0);
        const totalKg = verified.reduce((sum, j) => sum + (j.verified_kg || 0), 0);
        const paidJobs = allJobs.filter(j => j.status === 'PAID').length;
        const unpaidJobs = allJobs.filter(j => j.status === 'VERIFIED').length;

        setEarnings({
          total: totalEarnings,
          paid: paidEarnings,
          pending: pendingEarnings,
          totalKg,
          paidJobs,
          unpaidJobs,
        });

        // Set jobs with earnings for display
        const earningJobs = verified
          .filter(j => getEarningAmount(j) > 0)
          .sort((a, b) => new Date(b.verified_at || b.logged_at) - new Date(a.verified_at || a.logged_at));
        setJobs(earningJobs);
      }
    } catch (err) {
      console.error('[MyEarnings] Error:', err);
      setError(err.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
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

  const averageEarning = earnings.totalKg > 0 ? earnings.total / (jobs.length || 1) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Financial Overview</p>
          <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>My Earnings</h1>
          <p className="text-sm text-[#6B7280]">Track your verified waste income in one place.</p>
        </div>
        <button
          onClick={() => navigate('/picker/dashboard')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_70%)] p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Total Earnings</p>
            <p className="mt-2 text-3xl font-bold text-[#111111]">{formatUGX(earnings.total)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{earnings.paidJobs + earnings.unpaidJobs} verified jobs</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Paid Earnings</p>
            <p className="mt-2 text-3xl font-bold text-[#238636]">{formatUGX(earnings.paid)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{earnings.paidJobs} completed payments</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Pending Earnings</p>
            <p className="mt-2 text-3xl font-bold text-[#B45309]">{formatUGX(earnings.pending)}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{earnings.unpaidJobs} jobs awaiting payment</p>
          </div>
        </div>
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
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"><Hourglass size={14} /> Pending Payment</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{earnings.unpaidJobs}</p>
        </div>
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]"><TrendingUp size={14} /> Average / Job</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{formatUGX(averageEarning)}</p>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111111]">Earnings History</h2>
              <p className="text-sm text-[#6B7280]">Each verified job that generated income.</p>
            </div>
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
    </div>
  );
}

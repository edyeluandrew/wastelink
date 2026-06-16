import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint, resolveAgentSession } from '../utils/agentSession';
import AgentStatCard from '../components/AgentStatCard';
import { LoadingState, ErrorState, StatusBadge } from '../../components';
import { getEarningAmount } from '../../utils/earningsHelper';
import { getEstimatedKg, getVerifiedKg } from '../../utils/wasteLogHelpers';
import { formatUGX } from '../../utils/formatters';
import {
  Search,
  Clock3,
  CheckCircle2,
  CircleX,
  Scale,
  Wallet,
  ClipboardList,
  MapPin,
} from 'lucide-react';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [collectionPoint, setCollectionPoint] = useState(getAgentCollectionPoint());
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (pointId) => {
    if (!pointId) return;

    setLoading(true);
    setError(null);
    try {
      const logsResponse = await apiClient.get(
        `/waste-logs?collection_point_id=${pointId}&limit=100`
      );

      if (logsResponse.data.success) {
        const logs = logsResponse.data.data || [];
        const today = new Date().toDateString();
        const todayLogs = logs.filter((log) => new Date(log.created_at).toDateString() === today);
        const pendingLogs = logs.filter((log) => log.status === 'PENDING');
        const verifiedToday = todayLogs.filter((log) => log.status === 'VERIFIED');
        const rejectedToday = todayLogs.filter((log) => log.status === 'REJECTED');

        const totalVerifiedKgToday = verifiedToday.reduce(
          (sum, log) => sum + getVerifiedKg(log),
          0
        );

        const totalEarningsToday = verifiedToday.reduce(
          (sum, log) => sum + getEarningAmount(log),
          0
        );

        setStats({
          pendingDeliveries: pendingLogs.length,
          verifiedToday: verifiedToday.length,
          rejectedToday: rejectedToday.length,
          totalVerifiedKgToday: totalVerifiedKgToday.toFixed(2),
          totalEarningsToday,
        });

        setRecentLogs(logs.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const session = await resolveAgentSession();

        if (cancelled) return;

        const activeCollectionPoint = session.collectionPoint || getAgentCollectionPoint();
        setCollectionPoint(activeCollectionPoint);

        if (!activeCollectionPoint?.id) {
          navigate('/agent/select-point', { replace: true });
          return;
        }

        await fetchDashboardData(activeCollectionPoint.id);
      } catch (err) {
        if (!cancelled) {
          console.error('Error initializing agent dashboard:', err);
          setError(err.response?.data?.message || 'Failed to load dashboard data');
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData, navigate]);

  const formatNumber = (num) => {
    if (!num) return '0';
    return parseFloat(num).toFixed(2);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_75%)] p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#238636]">Welcome back</p>
        <h2 className="mt-1 text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>
          Agent Dashboard
        </h2>
        {collectionPoint && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#6B7280]">
            <MapPin size={14} />
            {collectionPoint.name} · {collectionPoint.division}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate('/agent/verify')}
          className="rounded-3xl bg-[#238636] p-4 text-left font-semibold text-white shadow-sm transition hover:bg-[#2F9E44]"
        >
          <span className="inline-flex items-center gap-2 text-lg">
            <Search size={20} /> Verify by Job Code
          </span>
          <p className="mt-1 text-sm font-normal text-green-100">Search and confirm delivery weight</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/agent/pending')}
          className="rounded-3xl bg-[#B45309] p-4 text-left font-semibold text-white shadow-sm transition hover:bg-[#D97706]"
        >
          <span className="inline-flex items-center gap-2 text-lg">
            <Clock3 size={20} /> View Pending
          </span>
          <p className="mt-1 text-sm font-normal text-amber-100">
            {stats ? `${stats.pendingDeliveries} waiting` : 'Review incoming deliveries'}
          </p>
        </button>
      </div>

      {loading && <LoadingState message="Loading dashboard..." />}

      {error && (
        <ErrorState
          error={error}
          onRetry={() => collectionPoint?.id && fetchDashboardData(collectionPoint.id)}
        />
      )}

      {!loading && !error && stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <AgentStatCard
            icon={Clock3}
            label="Pending"
            value={stats.pendingDeliveries}
            color="amber"
          />
          <AgentStatCard
            icon={CheckCircle2}
            label="Verified Today"
            value={stats.verifiedToday}
            color="green"
          />
          <AgentStatCard
            icon={CircleX}
            label="Rejected Today"
            value={stats.rejectedToday}
            color="red"
          />
          <AgentStatCard
            icon={Scale}
            label="KG Verified"
            value={`${formatNumber(stats.totalVerifiedKgToday)} kg`}
            color="blue"
          />
          <AgentStatCard
            icon={Wallet}
            label="Earnings Today"
            value={formatUGX(stats.totalEarningsToday)}
            color="green"
          />
        </div>
      )}

      {!loading && !error && recentLogs.length > 0 && (
        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-[#111111]">Recent Logs</h3>
            <button
              type="button"
              onClick={() => navigate('/agent/history')}
              className="text-sm font-semibold text-[#238636] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-all font-bold text-[#111111]">{log.job_code}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {log.picker_name} · {log.waste_type} · {getEstimatedKg(log).toFixed(2)} kg
                  </p>
                </div>
                <StatusBadge status={log.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate('/agent/pending')}
          className="rounded-3xl border-2 border-[#238636] px-4 py-4 font-semibold text-[#238636] transition hover:bg-[#EAF6EA]"
        >
          View All Pending Logs
        </button>
        <button
          type="button"
          onClick={() => navigate('/agent/history')}
          className="inline-flex items-center justify-center gap-2 rounded-3xl border-2 border-[#2563EB] px-4 py-4 font-semibold text-[#2563EB] transition hover:bg-[#EFF6FF]"
        >
          <ClipboardList size={18} />
          Processing History
        </button>
      </div>
    </div>
  );
}

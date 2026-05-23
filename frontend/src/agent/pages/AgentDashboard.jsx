import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint } from '../utils/agentSession';
import AgentStatCard from '../components/AgentStatCard';
import { LoadingState, ErrorState } from '../../components';
import { getEarningAmount } from '../../utils/earningsHelper';
import { getEstimatedKg, getVerifiedKg } from '../../utils/wasteLogHelpers';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const collectionPoint = getAgentCollectionPoint();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (!collectionPoint) return;
    
    setLoading(true);
    setError(null);
    try {
      // Fetch logs for this collection point to calculate stats
      const logsResponse = await apiClient.get(
        `/waste-logs?collection_point_id=${collectionPoint.id}&limit=100`
      );

      if (logsResponse.data.success) {
        const logs = logsResponse.data.data || [];

        // Calculate stats
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
          totalEarningsToday: totalEarningsToday,
        });

        // Get recent logs for display
        const recentData = logs.slice(0, 5);
        setRecentLogs(recentData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [collectionPoint?.id]);

  useEffect(() => {
    if (!collectionPoint) {
      navigate('/agent/select-point');
      return;
    }
    fetchDashboardData();
  }, [collectionPoint?.id, fetchDashboardData, navigate]);

  const formatNumber = (num) => {
    if (!num) return '0';
    return parseFloat(num).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/agent/verify')}
          className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-lg"
        >
          🔍 Verify by Job Code
        </button>
        <button
          onClick={() => navigate('/agent/pending')}
          className="p-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold text-lg"
        >
          ⏳ View Pending
        </button>
      </div>

      {/* Loading State */}
      {loading && <LoadingState message="Loading dashboard..." />}

      {/* Error State */}
      {error && <ErrorState error={error} onRetry={fetchDashboardData} />}

      {/* Stats Cards */}
      {!loading && !error && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <AgentStatCard
            icon="⏳"
            label="Pending Deliveries"
            value={stats.pendingDeliveries}
            color="amber"
          />
          <AgentStatCard
            icon="✓"
            label="Verified Today"
            value={stats.verifiedToday}
            color="green"
          />
          <AgentStatCard
            icon="✕"
            label="Rejected Today"
            value={stats.rejectedToday}
            color="red"
          />
          <AgentStatCard
            icon="⚖️"
            label="Total KG Verified"
            value={formatNumber(stats.totalVerifiedKgToday)}
            color="blue"
          />
          <AgentStatCard
            icon="💰"
            label="Earnings Generated"
            value={`${(stats.totalEarningsToday / 1000000).toFixed(1)}M UGX`}
            color="green"
          />
        </div>
      )}

      {/* Recent Logs */}
      {!loading && !error && recentLogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Recent Logs</h3>
            <button
              onClick={() => navigate('/agent/history')}
              className="text-sm text-green-600 hover:underline font-semibold"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentLogs.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 border border-gray-300 rounded flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{log.job_code}</p>
                  <p className="text-xs text-gray-600">
                    {log.picker_name} • {log.waste_type} • {getEstimatedKg(log).toFixed(2)} kg
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    log.status === 'VERIFIED'
                      ? 'bg-green-100 text-green-800'
                      : log.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
        <button
          onClick={() => navigate('/agent/pending')}
          className="p-4 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition font-semibold"
        >
          View All Pending Logs
        </button>
        <button
          onClick={() => navigate('/agent/history')}
          className="p-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
        >
          View Processing History
        </button>
      </div>
    </div>
  );
}

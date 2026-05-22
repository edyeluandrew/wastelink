import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint } from '../utils/agentSession';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState, EmptyState } from '../../components';

export default function AgentHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  // Memoized fetch function to avoid unnecessary re-renders
  const fetchHistory = useCallback(async () => {
    console.log('[AgentHistory] fetchHistory started');
    setLoading(true);
    setError(null);

    try {
      const collectionPoint = getAgentCollectionPoint();
      console.log('[AgentHistory] Selected collection point:', collectionPoint);

      if (!collectionPoint?.id) {
        console.warn('[AgentHistory] No collection point selected, redirecting');
        navigate('/agent/select-point');
        return;
      }

      const url = `/waste-logs?collection_point_id=${collectionPoint.id}`;
      console.log('[AgentHistory] Fetching from API URL:', url);

      const response = await apiClient.get(url);
      console.log('[AgentHistory] API response received:', response.data);

      if (response.data?.success) {
        const allLogs = response.data.data || [];
        console.log('[AgentHistory] Total logs received:', allLogs.length);

        // Filter out pending logs
        const processedLogs = allLogs.filter((log) => log.status !== 'PENDING');
        console.log('[AgentHistory] Non-pending logs (processed):', processedLogs.length);

        setLogs(processedLogs);
        console.log('[AgentHistory] Logs state updated successfully');
      } else {
        console.warn('[AgentHistory] Response success flag was false or missing');
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('[AgentHistory] Fetch error:', {
        message: err.message,
        status: err.response?.status,
        responseData: err.response?.data,
        url: err.config?.url,
      });
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      console.log('[AgentHistory] Setting loading to false');
      setLoading(false);
    }
  }, [navigate]);

  // Fetch on mount only
  useEffect(() => {
    console.log('[AgentHistory] Component mounted, calling fetchHistory');
    fetchHistory();
  }, [fetchHistory]);

  const getFilteredLogs = () => {
    if (filter === 'ALL') return logs;
    return logs.filter((log) => log.status === filter);
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Processing History</h2>
        <button
          onClick={fetchHistory}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition text-sm font-semibold"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['ALL', 'VERIFIED', 'REJECTED', 'PAID'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded font-semibold whitespace-nowrap transition ${
              filter === status
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {status === 'ALL'
              ? 'All'
              : status === 'VERIFIED'
                ? 'Verified ✓'
                : status === 'REJECTED'
                  ? 'Rejected ✕'
                  : 'Paid 💰'}
          </button>
        ))}
      </div>

      {loading && <LoadingState message="Loading history..." />}

      {error && <ErrorState error={error} onRetry={fetchHistory} />}

      {!loading && !error && filteredLogs.length === 0 && (
        <EmptyState
          message={
            filter === 'ALL'
              ? 'No processed logs yet'
              : `No ${filter.toLowerCase()} logs`
          }
        />
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
          </p>
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <AgentWasteLogCard
                key={log.id}
                log={log}
                showActions={false}
                onVerify={null}
                onReject={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="pt-4">
        <button
          onClick={() => navigate('/agent/dashboard')}
          className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition font-semibold"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

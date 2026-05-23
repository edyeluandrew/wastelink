import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint, resolveAgentSession } from '../utils/agentSession';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import { RotateCcw, ArrowLeft, CheckCircle2, CircleX, Wallet, ClipboardList } from 'lucide-react';

export default function AgentHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  // Memoized fetch function to avoid unnecessary re-renders
  const fetchHistory = useCallback(async (collectionPointId) => {
    console.log('[AgentHistory] fetchHistory started');
    setLoading(true);
    setError(null);

    try {
      const url = `/waste-logs?collection_point_id=${collectionPointId}`;
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
  }, []);

  // Fetch on mount only
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const session = await resolveAgentSession();

        if (cancelled) {
          return;
        }

        const activeCollectionPoint = session.collectionPoint || getAgentCollectionPoint();
        if (!activeCollectionPoint?.id) {
          console.warn('[AgentHistory] No collection point selected, redirecting');
          navigate('/agent/select-point', { replace: true });
          return;
        }

        console.log('[AgentHistory] Component mounted, calling fetchHistory');
        await fetchHistory(activeCollectionPoint.id);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load history');
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [fetchHistory, navigate]);

  const getFilteredLogs = () => {
    if (filter === 'ALL') return logs;
    return logs.filter((log) => log.status === filter);
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <ClipboardList size={24} /> Processing History
        </h2>
        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition text-sm font-semibold"
        >
          <RotateCcw size={16} /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'ALL', label: 'All', icon: ClipboardList },
          { value: 'VERIFIED', label: 'Verified', icon: CheckCircle2 },
          { value: 'REJECTED', label: 'Rejected', icon: CircleX },
          { value: 'PAID', label: 'Paid', icon: Wallet },
        ].map((status) => (
          <button
            key={status.value}
            onClick={() => setFilter(status.value)}
            className={`px-4 py-2 rounded font-semibold whitespace-nowrap transition ${
              filter === status.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <status.icon size={14} /> {status.label}
            </span>
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
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition font-semibold"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}

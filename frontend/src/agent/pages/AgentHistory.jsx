import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint, resolveAgentSession } from '../utils/agentSession';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import { RotateCcw, CheckCircle2, CircleX, Wallet, ClipboardList } from 'lucide-react';

export default function AgentHistory() {
  const navigate = useNavigate();
  const [collectionPointId, setCollectionPointId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const fetchHistory = useCallback(async (pointId) => {
    if (!pointId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/waste-logs?collection_point_id=${pointId}`);

      if (response.data?.success) {
        const processedLogs = (response.data.data || []).filter((log) => log.status !== 'PENDING');
        setLogs(processedLogs);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('[AgentHistory] Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load history');
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
        if (!activeCollectionPoint?.id) {
          navigate('/agent/select-point', { replace: true });
          return;
        }

        setCollectionPointId(activeCollectionPoint.id);
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

  const filteredLogs =
    filter === 'ALL' ? logs : logs.filter((log) => log.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-[#111111]">
            <ClipboardList size={24} /> Processing History
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">Verified, rejected, and paid deliveries</p>
        </div>
        <button
          type="button"
          onClick={() => fetchHistory(collectionPointId)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:border-[#238636] hover:text-[#238636]"
        >
          <RotateCcw size={16} /> Refresh
        </button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {[
          { value: 'ALL', label: 'All', icon: ClipboardList },
          { value: 'VERIFIED', label: 'Verified', icon: CheckCircle2 },
          { value: 'REJECTED', label: 'Rejected', icon: CircleX },
          { value: 'PAID', label: 'Paid', icon: Wallet },
        ].map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => setFilter(status.value)}
            className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              filter === status.value
                ? 'bg-[#238636] text-white'
                : 'bg-white text-[#111111] ring-1 ring-[#D9D9D9] hover:ring-[#238636]'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <status.icon size={14} /> {status.label}
            </span>
          </button>
        ))}
      </div>

      {loading && <LoadingState message="Loading history..." />}

      {error && <ErrorState error={error} onRetry={() => fetchHistory(collectionPointId)} />}

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
          <p className="mb-3 text-sm text-[#6B7280]">
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
    </div>
  );
}

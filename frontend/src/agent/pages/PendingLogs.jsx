import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint, resolveAgentSession } from '../utils/agentSession';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import { RotateCcw, Clock3 } from 'lucide-react';

export default function PendingLogs() {
  const navigate = useNavigate();
  const [collectionPointId, setCollectionPointId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

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
        await fetchPendingLogs(activeCollectionPoint.id);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load pending logs');
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const fetchPendingLogs = async (pointId = collectionPointId) => {
    if (!pointId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/waste-logs?status=PENDING&collection_point_id=${pointId}`
      );
      if (response.data.success) {
        setLogs(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching pending logs:', err);
      setError(err.response?.data?.message || 'Failed to load pending logs');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleVerify = async (logId, data) => {
    setRefreshing(true);
    try {
      const response = await apiClient.patch(`/waste-logs/${logId}/verify`, data);
      if (response.data.success) {
        setLogs((current) => current.filter((log) => log.id !== logId));
        showToast('Waste log verified successfully');
      }
    } catch (err) {
      console.error('Error verifying log:', err);
      setError(err.response?.data?.message || 'Failed to verify waste log');
    } finally {
      setRefreshing(false);
    }
  };

  const handleReject = async (logId, data) => {
    setRefreshing(true);
    try {
      const response = await apiClient.patch(`/waste-logs/${logId}/reject`, data);
      if (response.data.success) {
        setLogs((current) => current.filter((log) => log.id !== logId));
        showToast('Waste log rejected');
      }
    } catch (err) {
      console.error('Error rejecting log:', err);
      setError(err.response?.data?.message || 'Failed to reject waste log');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="rounded-2xl border border-[#BDE5BF] bg-[#EAF6EA] p-4 text-sm font-semibold text-[#238636]">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-[#111111]">
            <Clock3 size={24} /> Pending Deliveries
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">Verify incoming waste at your collection point</p>
        </div>
        <button
          type="button"
          onClick={() => fetchPendingLogs()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:border-[#238636] hover:text-[#238636]"
        >
          <RotateCcw size={16} /> Refresh
        </button>
      </div>

      {loading && <LoadingState message="Loading pending logs..." />}

      {error && <ErrorState error={error} onRetry={() => fetchPendingLogs()} />}

      {!loading && !error && logs.length === 0 && (
        <EmptyState message="No pending deliveries for this collection point" />
      )}

      {!loading && !error && logs.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-[#6B7280]">
            {logs.length} {logs.length === 1 ? 'delivery' : 'deliveries'} waiting for verification
          </p>
          <div className="space-y-3">
            {logs.map((log) => (
              <AgentWasteLogCard
                key={log.id}
                log={log}
                showActions
                onVerify={handleVerify}
                onReject={handleReject}
                isProcessing={refreshing}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

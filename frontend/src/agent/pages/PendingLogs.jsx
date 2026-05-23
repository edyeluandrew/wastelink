import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint, resolveAgentSession } from '../utils/agentSession';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import { RotateCcw, ArrowLeft, Clock3 } from 'lucide-react';

export default function PendingLogs() {
  const navigate = useNavigate();
  const collectionPoint = getAgentCollectionPoint();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
          navigate('/agent/select-point', { replace: true });
          return;
        }

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

  const fetchPendingLogs = async (collectionPointId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/waste-logs?status=PENDING&collection_point_id=${collectionPointId}`
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

  const handleVerify = async (logId, data) => {
    setRefreshing(true);
    try {
      const response = await apiClient.patch(`/waste-logs/${logId}/verify`, data);
      if (response.data.success) {
        setLogs(logs.filter((log) => log.id !== logId));
        alert('Waste log verified successfully!');
      }
    } catch (err) {
      console.error('Error verifying log:', err);
      alert(err.response?.data?.message || 'Failed to verify waste log');
    } finally {
      setRefreshing(false);
    }
  };

  const handleReject = async (logId, data) => {
    setRefreshing(true);
    try {
      const response = await apiClient.patch(`/waste-logs/${logId}/reject`, data);
      if (response.data.success) {
        setLogs(logs.filter((log) => log.id !== logId));
        alert('Waste log rejected successfully!');
      }
    } catch (err) {
      console.error('Error rejecting log:', err);
      alert(err.response?.data?.message || 'Failed to reject waste log');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <Clock3 size={24} /> Pending Deliveries
        </h2>
        <button
          onClick={fetchPendingLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition text-sm font-semibold"
        >
          <RotateCcw size={16} /> Refresh
        </button>
      </div>

      {loading && <LoadingState message="Loading pending logs..." />}

      {error && <ErrorState error={error} onRetry={fetchPendingLogs} />}

      {!loading && !error && logs.length === 0 && (
        <EmptyState message="No pending deliveries for this collection point" />
      )}

      {!loading && !error && logs.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {logs.length} {logs.length === 1 ? 'delivery' : 'deliveries'} waiting for verification
          </p>
          <div className="space-y-3">
            {logs.map((log) => (
              <AgentWasteLogCard
                key={log.id}
                log={log}
                showActions={true}
                onVerify={handleVerify}
                onReject={handleReject}
                isProcessing={refreshing}
              />
            ))}
          </div>
        </div>
      )}

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

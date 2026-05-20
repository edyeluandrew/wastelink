import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint } from '../utils/agentSession';
import AgentLayout from '../components/AgentLayout';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState, EmptyState } from '../../components';

export default function AgentHistory() {
  const navigate = useNavigate();
  const collectionPoint = getAgentCollectionPoint();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, VERIFIED, REJECTED, PAID

  useEffect(() => {
    if (!collectionPoint) {
      navigate('/agent/select-point');
      return;
    }
    fetchHistory();
  }, [collectionPoint, navigate]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/waste-logs?collection_point_id=${collectionPoint.id}&limit=200`
      );
      if (response.data.success) {
        const allLogs = response.data.data || [];
        // Filter out pending logs
        const processedLogs = allLogs.filter((log) => log.status !== 'PENDING');
        setLogs(processedLogs);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    if (filter === 'ALL') return logs;
    return logs.filter((log) => log.status === filter);
  };

  const filteredLogs = getFilteredLogs();

  return (
    <AgentLayout>
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
    </AgentLayout>
  );
}

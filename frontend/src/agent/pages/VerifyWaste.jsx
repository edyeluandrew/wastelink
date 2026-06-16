import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint, resolveAgentSession } from '../utils/agentSession';
import JobSearchBox from '../components/JobSearchBox';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState } from '../../components';
import { getEstimatedKg, getVerifiedKg, hasVerifiedKg } from '../../utils/wasteLogHelpers';
import { ClipboardCheck, AlertCircle } from 'lucide-react';

export default function VerifyWaste() {
  const navigate = useNavigate();
  const [collectionPoint, setCollectionPoint] = useState(getAgentCollectionPoint());
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accessWarning, setAccessWarning] = useState('');
  const [toast, setToast] = useState('');

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
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load verification session');
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSearch = async (jobCode) => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setLog(null);
    setAccessWarning('');

    try {
      const response = await apiClient.get(`/waste-logs/job/${jobCode}`);
      if (response.data.success && response.data.data) {
        const foundLog = response.data.data;

        if (collectionPoint?.id && foundLog.collection_point_id !== collectionPoint.id) {
          setAccessWarning('This job is assigned to another collection point.');
          setLog(foundLog);
          return;
        }

        setLog(foundLog);
      } else {
        setNotFound(true);
        setError('Waste log not found. Please check the Job Code and try again.');
      }
    } catch (err) {
      console.error('Error searching for waste log:', err);
      setNotFound(true);
      setError(err.response?.data?.message || 'Failed to search waste log');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (logId, data) => {
    setRefreshing(true);
    try {
      const response = await apiClient.patch(`/waste-logs/${logId}/verify`, data);
      if (response.data.success) {
        showToast('Waste log verified successfully');
        setLog(null);
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
        showToast('Waste log rejected');
        setLog(null);
      }
    } catch (err) {
      console.error('Error rejecting log:', err);
      setError(err.response?.data?.message || 'Failed to reject waste log');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="rounded-2xl border border-[#BDE5BF] bg-[#EAF6EA] p-4 text-sm font-semibold text-[#238636]">
          {toast}
        </div>
      )}

      <div>
        <h2 className="mb-2 inline-flex items-center gap-2 text-2xl font-bold text-[#111111]">
          <ClipboardCheck size={24} /> Verify by Job Code
        </h2>
        <p className="text-sm text-[#6B7280]">
          Search for a waste log using the Job Code to verify the actual weight received.
        </p>
      </div>

      <JobSearchBox onSearch={handleSearch} isLoading={loading} />

      {accessWarning && log && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{accessWarning}</p>
          <p className="mt-1 text-sm text-amber-800">
            {log.collection_point_name || 'Unknown collection point'}
          </p>
        </div>
      )}

      {loading && <LoadingState message="Searching for waste log..." />}

      {error && (
        <div className={`rounded-2xl border p-4 ${notFound ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
          <p className={`text-sm ${notFound ? 'text-red-800' : 'text-amber-800'}`}>{error}</p>
          {notFound && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotFound(false);
              }}
              className="mt-2 text-sm font-semibold text-red-700 underline"
            >
              Try another Job Code
            </button>
          )}
        </div>
      )}

      {log && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#BDE5BF] bg-[#EAF6EA] p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#238636]">
              <ClipboardCheck size={12} /> Waste Log Found
            </p>
            <p className="mt-1 break-all text-lg font-bold text-[#111111]">{log.job_code}</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              {log.waste_type || 'N/A'} · {getEstimatedKg(log)} kg estimated
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Verified: {hasVerifiedKg(log) ? `${getVerifiedKg(log)} kg` : 'Pending'}
            </p>
          </div>

          <AgentWasteLogCard
            log={log}
            showActions={!accessWarning}
            onVerify={handleVerify}
            onReject={handleReject}
            isProcessing={refreshing}
          />
        </div>
      )}

      {!log && !error && !loading && (
        <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-blue-700" />
          <p className="text-sm text-blue-900">
            Enter the Job Code from the waste delivery ticket. It looks like{' '}
            <strong>WL20260520120345</strong>
          </p>
        </div>
      )}
    </div>
  );
}

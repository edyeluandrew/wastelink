import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { getAgentCollectionPoint } from '../utils/agentSession';
import AgentLayout from '../components/AgentLayout';
import JobSearchBox from '../components/JobSearchBox';
import AgentWasteLogCard from '../components/AgentWasteLogCard';
import { LoadingState, ErrorState } from '../../components';

export default function VerifyWaste() {
  const navigate = useNavigate();
  const collectionPoint = getAgentCollectionPoint();
  const [searchTerm, setSearchTerm] = useState('');
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!collectionPoint) {
    navigate('/agent/select-point');
    return null;
  }

  const handleSearch = async (jobCode) => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setLog(null);

    try {
      const response = await apiClient.get(`/waste-logs/search?jobCode=${jobCode}`);
      if (response.data.success && response.data.data) {
        const foundLog = response.data.data;

        // Check if this log belongs to the selected collection point
        if (foundLog.collection_point_id !== collectionPoint.id) {
          setError(
            `This waste log is assigned to another collection point (${foundLog.collection_point_name || 'Unknown'}). You can only verify waste logs for your current location.`
          );
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
        alert('Waste log verified successfully!');
        setLog(null);
        setSearchTerm('');
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
        alert('Waste log rejected successfully!');
        setLog(null);
        setSearchTerm('');
      }
    } catch (err) {
      console.error('Error rejecting log:', err);
      alert(err.response?.data?.message || 'Failed to reject waste log');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Waste by Job Code</h2>
          <p className="text-sm text-gray-600">Search for a waste log using the Job Code to verify the actual weight received.</p>
        </div>

        {/* Search Box */}
        <JobSearchBox onSearch={handleSearch} isLoading={loading} />

        {/* Loading State */}
        {loading && <LoadingState message="Searching for waste log..." />}

        {/* Error State */}
        {error && (
          <div className={`p-4 rounded-lg border ${notFound ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
            <p className={`text-sm ${notFound ? 'text-red-800' : 'text-amber-800'}`}>{error}</p>
            {notFound && (
              <button
                onClick={() => {
                  setError(null);
                  setSearchTerm('');
                }}
                className="mt-2 text-sm font-semibold underline"
              >
                Try another Job Code
              </button>
            )}
          </div>
        )}

        {/* Log Found */}
        {log && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <p className="text-xs text-green-700 font-semibold">WASTE LOG FOUND</p>
              <p className="text-lg font-bold text-green-900">{log.job_code}</p>
            </div>

            <AgentWasteLogCard
              log={log}
              showActions={true}
              onVerify={handleVerify}
              onReject={handleReject}
              isProcessing={refreshing}
            />
          </div>
        )}

        {/* Info Message */}
        {!log && !error && !loading && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              Enter the Job Code from the waste delivery ticket above to search for the waste log. The Job Code looks like: <strong>WL20260520120345</strong>
            </p>
          </div>
        )}

        {/* Back Button */}
        <div>
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

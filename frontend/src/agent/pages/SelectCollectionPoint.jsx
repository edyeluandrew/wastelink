import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { setAgentCollectionPoint } from '../utils/agentSession';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import { MapPin, Building2, UserRound, Phone, Navigation, ArrowRight, Info } from 'lucide-react';

export default function SelectCollectionPoint() {
  const navigate = useNavigate();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCollectionPoints();
  }, []);

  const fetchCollectionPoints = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/collection-points');
      if (response.data.success) {
        const activePoints = response.data.data.filter((p) => p.status !== 'INACTIVE');
        setPoints(activePoints);
      }
    } catch (err) {
      console.error('Error fetching collection points:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load collection points');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPoint = (point) => {
    setAgentCollectionPoint(point);
    navigate('/agent/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100">
      {/* Header */}
      <div className="bg-green-600 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold inline-flex items-center gap-3" style={{ fontFamily: 'Orbitron' }}>
            <MapPin size={28} />
            WasteLink Agent
          </h1>
          <p className="text-green-100 mt-2">Select Your Collection Point</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6 flex gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-700" />
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This is a temporary selection for the MVP demo. When authentication is implemented, your collection point will be automatically linked to your account.
          </p>
        </div>

        {/* Loading State */}
        {loading && <LoadingState message="Loading collection points..." />}

        {/* Error State */}
        {error && <ErrorState error={error} onRetry={fetchCollectionPoints} />}

        {/* Empty State */}
        {!loading && !error && points.length === 0 && (
          <EmptyState message="No active collection points available" />
        )}

        {/* Points Grid */}
        {!loading && !error && points.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {points.map((point) => (
              <div
                key={point.id}
                className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden hover:shadow-lg transition transform hover:scale-105"
              >
                {/* Card Header */}
                <div className="bg-green-50 border-b border-gray-300 p-4">
                  <p className="text-xs text-gray-600 font-semibold inline-flex items-center gap-1.5">
                    <MapPin size={12} /> LOCATION CODE
                  </p>
                  <p className="text-lg font-bold text-gray-900">{point.point_code || `CP-${point.id}`}</p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 inline-flex items-center gap-1.5"><Building2 size={12} /> Name</p>
                    <p className="font-semibold text-gray-900">{point.name}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 inline-flex items-center gap-1.5"><MapPin size={12} /> Division</p>
                    <p className="font-semibold text-gray-900">{point.division || 'N/A'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-600 inline-flex items-center gap-1.5"><UserRound size={12} /> Agent</p>
                      <p className="text-sm font-semibold text-gray-900">{point.agent_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 inline-flex items-center gap-1.5"><Phone size={12} /> Phone</p>
                      <p className="text-sm font-semibold text-gray-900">{point.agent_phone || 'N/A'}</p>
                    </div>
                  </div>

                  {point.gps_lat && point.gps_lng && (
                    <div>
                      <p className="text-xs text-gray-600 inline-flex items-center gap-1.5"><Navigation size={12} /> GPS Coordinates</p>
                      <p className="text-xs text-gray-700">{point.gps_lat.toFixed(4)}, {point.gps_lng.toFixed(4)}</p>
                    </div>
                  )}

                  <button
                    onClick={() => handleSelectPoint(point)}
                    className="w-full mt-4 py-2 px-4 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition inline-flex items-center justify-center gap-2"
                  >
                    Use This Location <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            <a href="/" className="text-green-600 hover:underline">
              Back to Admin Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

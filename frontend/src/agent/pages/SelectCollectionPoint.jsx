import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { setAgentCollectionPoint } from '../utils/agentSession';
import { getAuthUser } from '../../utils/auth';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import { MapPin, Building2, UserRound, Phone, Navigation, Info, CheckCircle2 } from 'lucide-react';

export default function SelectCollectionPoint() {
  const navigate = useNavigate();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authUser = getAuthUser();
  const assignedPoint = authUser?.role === 'AGENT' ? authUser.collection_point || null : null;
  const isAuthenticatedAgent = authUser?.role === 'AGENT';

  useEffect(() => {
    if (isAuthenticatedAgent) {
      setLoading(false);
      return;
    }

    fetchCollectionPoints();
  }, [isAuthenticatedAgent]);

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
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="bg-[linear-gradient(135deg,#238636_0%,#2F9E44_100%)] px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-10 w-10 rounded-xl bg-white/20 p-1" />
            <div>
              <h1 className="text-2xl font-bold md:text-3xl" style={{ fontFamily: 'Orbitron' }}>
                WasteLink Agent
              </h1>
              <p className="mt-1 text-sm text-green-100">Select your collection point</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <div className="mb-6 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-700" />
          <p className="text-sm text-blue-900">
            When an agent is signed in, the assigned collection point is linked by admin and cannot be changed here.
          </p>
        </div>

        {isAuthenticatedAgent && (
          <div className="mb-6 rounded-3xl border border-[#BDE5BF] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#238636]">Assigned Collection Point</p>
            {assignedPoint ? (
              <div className="mt-3 space-y-2">
                <p className="text-xl font-bold text-[#111111]">{assignedPoint.name}</p>
                <p className="text-sm text-[#6B7280]">{assignedPoint.point_code || `CP-${assignedPoint.id}`}</p>
                <p className="text-sm text-[#6B7280]">{assignedPoint.division || 'N/A'}</p>
                <button
                  type="button"
                  onClick={() => navigate('/agent/dashboard')}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#238636] px-4 py-3 font-semibold text-white transition hover:bg-[#2F9E44] sm:w-auto"
                >
                  <CheckCircle2 size={18} />
                  Go to Agent Dashboard
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-amber-700">
                No assigned collection point was found for this account. Please contact an admin.
              </p>
            )}
          </div>
        )}

        {loading && <LoadingState message="Loading collection points..." />}

        {error && <ErrorState error={error} onRetry={fetchCollectionPoints} />}

        {!isAuthenticatedAgent && !loading && !error && points.length === 0 && (
          <EmptyState message="No active collection points available" />
        )}

        {!isAuthenticatedAgent && !loading && !error && points.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {points.map((point) => (
              <div
                key={point.id}
                className="overflow-hidden rounded-3xl border border-[#D9D9D9] bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="border-b border-[#D9D9D9] bg-[#EAF6EA] p-4">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#238636]">
                    <MapPin size={12} /> Location Code
                  </p>
                  <p className="text-lg font-bold text-[#111111]">{point.point_code || `CP-${point.id}`}</p>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]"><Building2 size={12} /> Name</p>
                    <p className="font-semibold text-[#111111]">{point.name}</p>
                  </div>

                  <div>
                    <p className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]"><MapPin size={12} /> Division</p>
                    <p className="font-semibold text-[#111111]">{point.division || 'N/A'}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]"><UserRound size={12} /> Agent</p>
                      <p className="text-sm font-semibold text-[#111111]">{point.agent_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]"><Phone size={12} /> Phone</p>
                      <p className="text-sm font-semibold text-[#111111]">{point.agent_phone || 'N/A'}</p>
                    </div>
                  </div>

                  {point.gps_lat && point.gps_lng && (
                    <div>
                      <p className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]"><Navigation size={12} /> GPS</p>
                      <p className="text-xs text-[#6B7280]">{point.gps_lat.toFixed(4)}, {point.gps_lng.toFixed(4)}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSelectPoint(point)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#238636] px-4 py-3 font-semibold text-white transition hover:bg-[#2F9E44]"
                  >
                    Use This Location
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAuthenticatedAgent && (
          <div className="mt-8 text-center">
            <p className="text-xs text-[#6B7280]">
              <a href="/" className="font-semibold text-[#238636] hover:underline">
                Back to Admin Dashboard
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

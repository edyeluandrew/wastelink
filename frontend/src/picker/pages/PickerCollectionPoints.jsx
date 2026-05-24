import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import CollectionPointCard from '../components/CollectionPointCard';
import apiClient from '../../api/axios';
import { getCurrentPicker } from '../utils/pickerSession';
import { Search, MapPin, Filter, ArrowRight } from 'lucide-react';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

export default function PickerCollectionPoints() {
  const navigate = useNavigate();
  const picker = getCurrentPicker();

  const [points, setPoints] = useState([]);
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllDivisions, setShowAllDivisions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');

  useEffect(() => {
    if (!picker?.id) {
      navigate(AUTH_ENFORCED ? '/login' : '/picker/start', { replace: true });
      return;
    }
    
    fetchCollectionPoints();
  }, [picker?.id, navigate]);

  useEffect(() => {
    const sortedPoints = [...points].sort((a, b) => {
      const aScore = a.division === picker?.division ? 0 : 1;
      const bScore = b.division === picker?.division ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return String(a.name).localeCompare(String(b.name));
    });

    let nextPoints = sortedPoints;

    if (!showAllDivisions) {
      nextPoints = nextPoints.filter(point => point.division === picker?.division || point.division === null || point.division === undefined);
    }

    if (divisionFilter !== 'ALL') {
      nextPoints = nextPoints.filter(point => point.division === divisionFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      nextPoints = nextPoints.filter(point =>
        String(point.name).toLowerCase().includes(term) ||
        String(point.point_code).toLowerCase().includes(term) ||
        String(point.agent_name || '').toLowerCase().includes(term)
      );
    }

    setFilteredPoints(nextPoints);
  }, [points, showAllDivisions, picker?.division, searchTerm, divisionFilter]);

  const fetchCollectionPoints = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/collection-points');
      
      if (response.data?.success) {
        const activePoints = (response.data.data || []).filter(p => p.status === 'ACTIVE');
        setPoints(activePoints);
      }
    } catch (err) {
      console.error('[PickerCollectionPoints] Error:', err);
      setError(err.response?.data?.message || 'Failed to load collection points');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading collection points..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchCollectionPoints} />;
  }

  if (points.length === 0) {
    return (
      <EmptyState
        title="No collection points available"
        message="Check back later"
        icon={MapPin}
      />
    );
  }

  const divisions = Array.from(new Set(points.map(point => point.division).filter(Boolean)));
  const pickerDivisionPoints = filteredPoints.filter(p => p.division === picker?.division);
  const otherDivisionPoints = filteredPoints.filter(p => p.division !== picker?.division);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Collection Network</p>
          <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>Collection Points</h1>
          <p className="text-sm text-[#6B7280]">Choose a point when logging waste.</p>
        </div>
        <button
          onClick={() => navigate('/picker/dashboard')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="rounded-3xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <div className="flex items-center gap-2 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-4 py-3">
            <Search size={16} className="text-[#6B7280]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search collection point or agent"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-4 py-3 text-sm"
          >
            <option value="ALL">All Divisions</option>
            {divisions.map((division) => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowAllDivisions(prev => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-4 py-3 text-sm font-semibold text-[#111111]"
          >
            <Filter size={16} className="text-[#238636]" />
            {showAllDivisions ? 'Show Picker Division First' : 'Show All Divisions'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-[#6B7280]">
        <span className="rounded-full bg-[#EAF6EA] px-3 py-1 font-semibold text-[#238636]">{filteredPoints.length} active points</span>
        <span className="rounded-full bg-[#F8F9FA] px-3 py-1">Your division: {picker?.division}</span>
      </div>

      {pickerDivisionPoints.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#238636]">
            Your Division: {picker?.division}
          </p>
          {pickerDivisionPoints.map(point => (
            <CollectionPointCard
              key={point.id}
              point={point}
              onUse={(selectedPoint) => navigate('/picker/log-waste', { state: { collectionPointId: selectedPoint.id } })}
            />
          ))}
        </div>
      )}

      {showAllDivisions && otherDivisionPoints.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#6B7280] mt-2">Other Divisions</p>
          {otherDivisionPoints.map(point => (
            <CollectionPointCard
              key={point.id}
              point={point}
              onUse={(selectedPoint) => navigate('/picker/log-waste', { state: { collectionPointId: selectedPoint.id } })}
            />
          ))}
        </div>
      )}

      {filteredPoints.length === 0 && (
        <EmptyState
          title="No matching collection points"
          message="Try another division or search term."
          icon={MapPin}
          actionLabel="Log Waste"
          actionIcon={ArrowRight}
          onAction={() => navigate('/picker/log-waste')}
        />
      )}
    </div>
  );
}

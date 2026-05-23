import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import CollectionPointCard from '../components/CollectionPointCard';
import apiClient from '../../api/axios';
import { getPickerSession } from '../utils/pickerSession';

export default function PickerCollectionPoints() {
  const navigate = useNavigate();
  const picker = getPickerSession();

  const [points, setPoints] = useState([]);
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllDivisions, setShowAllDivisions] = useState(false);

  useEffect(() => {
    if (!picker?.id) {
      navigate('/picker/start');
      return;
    }
    
    fetchCollectionPoints();
  }, [picker?.id, navigate]);

  useEffect(() => {
    // Filter points - show picker's division first if not showing all
    if (showAllDivisions) {
      setFilteredPoints(points);
    } else {
      // Sort: picker's division first, then others
      const pickersPoints = points.filter(p => p.division === picker?.division);
      const otherPoints = points.filter(p => p.division !== picker?.division);
      setFilteredPoints([...pickersPoints, ...otherPoints]);
    }
  }, [points, showAllDivisions, picker?.division]);

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
        icon="📍"
      />
    );
  }

  const pickerDivisionPoints = filteredPoints.filter(p => p.division === picker?.division);
  const otherDivisionPoints = filteredPoints.filter(p => p.division !== picker?.division);

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={() => navigate('/picker/dashboard')}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Collection Points</h1>
        <p className="text-sm text-gray-600 mb-4">
          Choose one when logging your waste
        </p>
      </div>

      {/* Show All Toggle */}
      {otherDivisionPoints.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="showAll"
            checked={showAllDivisions}
            onChange={(e) => setShowAllDivisions(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="showAll" className="text-sm font-medium text-gray-700">
            Show all divisions
          </label>
        </div>
      )}

      {/* Points in Picker's Division */}
      {pickerDivisionPoints.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-700 mb-2">
            📍 Your Division: {picker?.division}
          </p>
          {pickerDivisionPoints.map(point => (
            <CollectionPointCard key={point.id} point={point} />
          ))}
        </div>
      )}

      {/* Points in Other Divisions */}
      {showAllDivisions && otherDivisionPoints.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2 mt-4">
            📍 Other Divisions
          </p>
          {otherDivisionPoints.map(point => (
            <CollectionPointCard key={point.id} point={point} />
          ))}
        </div>
      )}

      {filteredPoints.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No collection points available in your division</p>
        </div>
      )}
    </div>
  );
}

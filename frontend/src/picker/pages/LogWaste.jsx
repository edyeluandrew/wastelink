import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, Button, Modal } from '../../components';
import apiClient from '../../api/axios';
import { getPickerSession } from '../utils/pickerSession';

const WASTE_TYPES = ['PLASTIC', 'MIXED_RECYCLABLES', 'ORGANIC', 'E_WASTE', 'METAL_CARDBOARD'];

export default function LogWaste() {
  const navigate = useNavigate();
  const picker = getPickerSession();

  const [collectionPoints, setCollectionPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successJobCode, setSuccessJobCode] = useState(null);

  const [form, setForm] = useState({
    waste_type: '',
    estimated_kg: '',
    collection_point_id: '',
  });

  useEffect(() => {
    if (!picker?.id) {
      navigate('/picker/start');
      return;
    }
    
    fetchCollectionPoints();
  }, [picker?.id, navigate]);

  const fetchCollectionPoints = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/collection-points');
      
      if (response.data?.success) {
        const points = response.data.data || [];
        const activePoints = points.filter(p => p.status === 'ACTIVE');
        setCollectionPoints(activePoints);
      }
    } catch (err) {
      console.error('[LogWaste] Error fetching points:', err);
      setError('Failed to load collection points');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.waste_type) {
      setError('Please select a waste type');
      return false;
    }
    if (!form.estimated_kg || parseInt(form.estimated_kg) <= 0) {
      setError('Estimated kg must be greater than 0');
      return false;
    }
    if (!form.collection_point_id) {
      setError('Please select a collection point');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        picker_id: picker.id,
        collection_point_id: parseInt(form.collection_point_id),
        waste_type: form.waste_type,
        estimated_kg: parseFloat(form.estimated_kg),
      };

      const response = await apiClient.post('/waste-logs', payload);

      if (response.data?.success && response.data.data) {
        // Show success modal with Job Code
        setSuccessJobCode(response.data.data);
        setForm({ waste_type: '', estimated_kg: '', collection_point_id: '' });
      } else {
        setError(response.data?.message || 'Failed to log waste');
      }
    } catch (err) {
      console.error('[LogWaste] Error:', err);
      setError(err.response?.data?.message || 'Failed to submit waste log');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading collection points..." />;
  }

  if (collectionPoints.length === 0) {
    return (
      <ErrorState
        error="No active collection points available"
        onRetry={fetchCollectionPoints}
      />
    );
  }

  if (successJobCode) {
    const selectedPoint = collectionPoints.find(
      p => p.id === parseInt(form.collection_point_id)
    );

    return (
      <Modal>
        <div className="bg-white rounded-lg p-8 max-w-sm mx-auto text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-900 mb-2">Waste Logged!</h2>
          
          <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4 my-6">
            <p className="text-xs text-green-700 font-medium mb-1">Your Job Code</p>
            <p className="text-3xl font-mono font-bold text-green-900">
              {successJobCode.job_code}
            </p>
          </div>

          <div className="text-left space-y-2 mb-6 text-sm">
            <p><strong>Waste Type:</strong> {form.waste_type}</p>
            <p><strong>Estimated:</strong> {form.estimated_kg} kg</p>
            <p><strong>Collection Point:</strong> {selectedPoint?.name}</p>
          </div>

          <p className="text-gray-700 text-sm mb-6">
            📍 Take your waste to <strong>{selectedPoint?.name}</strong> for weighing and verification.
          </p>

          <div className="space-y-2">
            <Button
              onClick={() => navigate('/picker/jobs')}
              className="w-full bg-green-700 text-white hover:bg-green-800"
            >
              View My Jobs
            </Button>
            <button
              onClick={() => {
                setSuccessJobCode(null);
                setForm({ waste_type: '', estimated_kg: '', collection_point_id: '' });
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Log Another Waste
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Log Waste</h1>
        <p className="text-sm text-gray-600">Create a new waste log and get your Job Code</p>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-300">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Waste Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Waste Type *
            </label>
            <select
              name="waste_type"
              value={form.waste_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={submitting}
            >
              <option value="">Select waste type</option>
              {WASTE_TYPES.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Estimated KG */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Estimated Weight (kg) *
            </label>
            <input
              type="number"
              name="estimated_kg"
              value={form.estimated_kg}
              onChange={handleChange}
              placeholder="5"
              min="0.1"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={submitting}
            />
          </div>

          {/* Collection Point */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Collection Point *
            </label>
            <select
              name="collection_point_id"
              value={form.collection_point_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={submitting}
            >
              <option value="">Select a collection point</option>
              {collectionPoints.map(point => (
                <option key={point.id} value={point.id}>
                  {point.name} ({point.division})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.waste_type || !form.estimated_kg || !form.collection_point_id}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Waste Log'}
          </Button>
        </form>
      </div>

      <p className="text-xs text-gray-600 text-center mt-4">
        You will receive a Job Code to bring with your waste.
      </p>
    </div>
  );
}

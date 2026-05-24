import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, Button, Modal } from '../../components';
import apiClient from '../../api/axios';
import { getCurrentPicker, getCurrentPickerId } from '../utils/pickerSession';
import { formatKg } from '../../utils/formatters';
import { Recycle, MapPin, Scale, ClipboardCheck, ArrowRight, LayoutDashboard } from 'lucide-react';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

const WASTE_TYPES = ['PLASTIC', 'MIXED_RECYCLABLES', 'ORGANIC', 'E_WASTE', 'METAL_CARDBOARD'];

export default function LogWaste() {
  const navigate = useNavigate();
  const location = useLocation();
  const picker = getCurrentPicker();
  const pickerId = getCurrentPickerId();

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

  const preselectedCollectionPointId = location.state?.collectionPointId || new URLSearchParams(location.search).get('point') || '';

  useEffect(() => {
    if (!pickerId) {
      navigate(AUTH_ENFORCED ? '/login' : '/picker/start', { replace: true });
      return;
    }
    
    fetchCollectionPoints();
  }, [pickerId, navigate]);

  useEffect(() => {
    if (preselectedCollectionPointId) {
      setForm(prev => ({
        ...prev,
        collection_point_id: String(preselectedCollectionPointId),
      }));
    }
  }, [preselectedCollectionPointId]);

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
        picker_id: pickerId,
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
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_65%)] p-6 shadow-sm">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#238636] shadow-sm">
            <ClipboardCheck size={28} />
          </div>
          <h2 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>Waste Logged</h2>
          <p className="text-sm text-[#6B7280]">Keep this Job Code for verification</p>
        </div>

        <div className="rounded-3xl border border-[#238636] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Job Code</p>
          <p className="mt-2 text-4xl font-bold tracking-widest text-[#238636]">{successJobCode.job_code}</p>
          <div className="mt-4 inline-flex rounded-full bg-[#FFF7E6] px-3 py-1 text-sm font-semibold text-[#B45309]">Status: PENDING</div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Waste Type</p>
            <p className="mt-1 text-lg font-semibold text-[#111111]">{successJobCode.waste_type || form.waste_type}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Estimated Weight</p>
            <p className="mt-1 text-lg font-semibold text-[#111111]">{formatKg(successJobCode.estimated_kg || form.estimated_kg)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Collection Point</p>
            <p className="mt-1 text-lg font-semibold text-[#111111]">{successJobCode.collection_point_name}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] p-4 text-sm text-[#111111]">
          Take your waste to the selected collection point. The agent will verify the actual weight and update your earnings.
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Button onClick={() => navigate('/picker/jobs')} className="inline-flex items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2F9E44]">
            View My Jobs <ArrowRight size={16} />
          </Button>
          <Button onClick={() => navigate('/picker/dashboard')} variant="secondary" className="inline-flex items-center justify-center gap-2 border border-[#D9D9D9] bg-white text-[#111111] hover:border-[#238636]">
            <LayoutDashboard size={16} /> Dashboard
          </Button>
          <button
            onClick={() => {
              setSuccessJobCode(null);
              setForm({ waste_type: '', estimated_kg: '', collection_point_id: preselectedCollectionPointId ? String(preselectedCollectionPointId) : '' });
            }}
            className="rounded-2xl border border-[#D9D9D9] bg-white px-4 py-2 font-semibold text-[#111111] transition hover:border-[#238636]"
          >
            Log Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="mb-2">
        <button
          onClick={() => navigate('/picker/dashboard')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Step 1 of 3</p>
        <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>Log Waste</h1>
        <p className="text-sm text-[#6B7280]">Create a waste log and get your Job Code.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#111111]"><Recycle size={16} className="text-[#238636]" /> Step 1</p>
          <p className="text-sm text-[#6B7280]">Select the waste type you collected.</p>
        </div>
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#111111]"><Scale size={16} className="text-[#238636]" /> Step 2</p>
          <p className="text-sm text-[#6B7280]">Enter your estimated weight in kilograms.</p>
        </div>
        <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#111111]"><MapPin size={16} className="text-[#238636]" /> Step 3</p>
          <p className="text-sm text-[#6B7280]">Choose the collection point you will visit.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
        <div className="mb-4 rounded-2xl bg-[#EAF6EA] p-4 text-sm text-[#111111]">
          Estimated weight will be confirmed at the collection point.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Waste Type *</label>
            <select
              name="waste_type"
              value={form.waste_type}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
              disabled={submitting}
            >
              <option value="">Select waste type</option>
              {WASTE_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Estimated Weight (kg) *</label>
            <input
              type="number"
              name="estimated_kg"
              value={form.estimated_kg}
              onChange={handleChange}
              placeholder="5"
              min="0.1"
              step="0.1"
              className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
              disabled={submitting}
            />
            <p className="mt-2 text-xs text-[#6B7280]">Use your best estimate. The agent will confirm it later.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Collection Point *</label>
            <select
              name="collection_point_id"
              value={form.collection_point_id}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
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

          {form.collection_point_id && (
            <div className="rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] p-4 text-sm text-[#111111]">
              Selected collection point: {collectionPoints.find(point => String(point.id) === String(form.collection_point_id))?.name}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.waste_type || !form.estimated_kg || !form.collection_point_id}
            className="w-full bg-[#238636] text-white hover:bg-[#2F9E44]"
          >
            {submitting ? 'Submitting...' : 'Submit Waste Log'}
          </Button>
        </form>
      </div>

      <p className="text-xs text-[#6B7280] text-center mt-4">
        You will receive a Job Code to bring with your waste.
      </p>
    </div>
  );
}

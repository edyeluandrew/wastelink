import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, Button } from '../../components';
import apiClient from '../../api/axios';
import { getCurrentPickerId } from '../utils/pickerSession';
import { Recycle, MapPin, Scale } from 'lucide-react';
import { formatUGX } from '../../utils/formatters';
import { DEFAULT_CITY } from '../../utils/city';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';
const PILOT_CITY = DEFAULT_CITY;

export default function LogWaste() {
  const navigate = useNavigate();
  const location = useLocation();
  const pickerId = getCurrentPickerId();

  const [collectionPoints, setCollectionPoints] = useState([]);
  const [cityWasteTypes, setCityWasteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [estimatedAmount, setEstimatedAmount] = useState(0);
  const [estimatePayable, setEstimatePayable] = useState(true);

  const [form, setForm] = useState({
    city_waste_type_id: '',
    estimated_kg: '',
    collection_point_id: '',
  });

  const preselectedCollectionPointId = location.state?.collectionPointId || new URLSearchParams(location.search).get('point') || '';

  useEffect(() => {
    if (!pickerId) {
      navigate(AUTH_ENFORCED ? '/login' : '/picker/start', { replace: true });
      return;
    }

    fetchInitialData();
  }, [pickerId, navigate]);

  useEffect(() => {
    if (preselectedCollectionPointId) {
      setForm(prev => ({
        ...prev,
        collection_point_id: String(preselectedCollectionPointId),
      }));
    }
  }, [preselectedCollectionPointId]);

  useEffect(() => {
    const kg = parseFloat(form.estimated_kg);
    if (!form.city_waste_type_id || !Number.isFinite(kg) || kg <= 0) {
      setEstimatedAmount(0);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await apiClient.get('/city-waste-types/estimate', {
          params: {
            city: PILOT_CITY,
            city_waste_type_id: form.city_waste_type_id,
            estimated_kg: kg,
          },
        });
        if (cancelled) return;
        if (response.data?.success) {
          setEstimatedAmount(Number(response.data.data?.estimated_amount) || 0);
          setEstimatePayable(response.data.data?.is_payable !== false);
        }
      } catch {
        if (!cancelled) setEstimatedAmount(0);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.city_waste_type_id, form.estimated_kg]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [pointsRes, typesRes] = await Promise.all([
        apiClient.get('/collection-points'),
        apiClient.get('/city-waste-types/active', { params: { city: PILOT_CITY } }),
      ]);

      if (pointsRes.data?.success) {
        const points = pointsRes.data.data || [];
        setCollectionPoints(points.filter(p => p.status === 'ACTIVE'));
      }

      if (typesRes.data?.success) {
        setCityWasteTypes(typesRes.data.data || []);
      }
    } catch (err) {
      console.error('[LogWaste] Error fetching data:', err);
      setError('Failed to load waste types and collection points');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const selectedWasteType = cityWasteTypes.find(
    (t) => String(t.id) === String(form.city_waste_type_id)
  );

  const validateForm = () => {
    if (!form.city_waste_type_id) {
      setError('Please select a waste type');
      return false;
    }
    if (!form.estimated_kg || parseFloat(form.estimated_kg) <= 0) {
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
        collection_point_id: parseInt(form.collection_point_id, 10),
        city_waste_type_id: parseInt(form.city_waste_type_id, 10),
        estimated_kg: parseFloat(form.estimated_kg),
      };

      const response = await apiClient.post('/waste-logs', payload);

      if (response.data?.success && response.data.data) {
        const logged = response.data.data;
        const estText = logged.estimated_amount
          ? ` Est. earning ${Number(logged.estimated_amount).toLocaleString()} UGX (pending verification).`
          : '';
        navigate('/picker/dashboard', {
          replace: true,
          state: {
            toast: `Waste logged! Job ${logged.job_code}.${estText}`,
            newLogId: logged.id,
          },
        });
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
    return <LoadingState message="Loading waste types..." />;
  }

  if (collectionPoints.length === 0) {
    return (
      <ErrorState
        error="No active collection points available"
        onRetry={fetchInitialData}
      />
    );
  }

  if (cityWasteTypes.length === 0) {
    return (
      <ErrorState
        error="No active waste types configured for your city. Please contact your city admin."
        onRetry={fetchInitialData}
      />
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
          Estimated weight will be confirmed at the collection point. Any price shown is an estimate until the agent verifies your actual kg.
        </div>

        {estimatedAmount > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Your estimated earning</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{formatUGX(estimatedAmount)}</p>
            <p className="mt-1 text-xs text-amber-700">
              Pending agent verification — final amount confirmed at the collection point
            </p>
          </div>
        )}

        {selectedWasteType && !estimatePayable && form.estimated_kg && (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            This waste type is tracked for reporting only — no payment for this log.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Waste Type *</label>
            <select
              name="city_waste_type_id"
              value={form.city_waste_type_id}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
              disabled={submitting}
            >
              <option value="">Select waste type</option>
              {cityWasteTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {type.reporting_category_name ? ` (${type.reporting_category_name})` : ''}
                </option>
              ))}
            </select>
            {selectedWasteType && (
              <p className="mt-2 text-xs text-[#6B7280]">
                {estimatePayable === false
                  ? 'Track-only — no payment for this waste type'
                  : 'You will see your estimated earning after entering weight'}
              </p>
            )}
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
            disabled={submitting || !form.city_waste_type_id || !form.estimated_kg || !form.collection_point_id}
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

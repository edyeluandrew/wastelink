import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { LoadingState, ErrorState, Button, StatusBadge } from '../../components';
import { formatUGX } from '../../utils/formatters';

export default function BatchDetails() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestedKg, setRequestedKg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/recycler/inventory/${batchId}`);
        const data = res.data?.data?.batch;
        setBatch(data);
        setRequestedKg(String(data?.available_kg || ''));
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [batchId]);

  const handleRequest = async () => {
    setMessage('');
    setSubmitting(true);
    try {
      await api.post('/recycler/purchase-requests', {
        batch_id: Number(batchId),
        requested_kg: Number(requestedKg),
      });
      setMessage('Purchase request submitted successfully.');
      setTimeout(() => navigate('/recycler/requests'), 1200);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading batch..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  if (!batch) return <ErrorState error={{ message: 'Batch not found' }} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-[#6B7280]">{batch.batch_code}</p>
        <h1 className="text-2xl font-bold text-[#111111]">{batch.waste_type}</h1>
        <div className="mt-2"><StatusBadge status={batch.status} /></div>
      </div>

      <section className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs uppercase text-[#6B7280]">Verified kg</p><p className="font-semibold">{Number(batch.verified_kg).toFixed(1)} kg</p></div>
          <div><p className="text-xs uppercase text-[#6B7280]">Available kg</p><p className="font-semibold">{Number(batch.available_kg).toFixed(1)} kg</p></div>
          <div><p className="text-xs uppercase text-[#6B7280]">Collection point</p><p className="font-semibold">{batch.collection_point_name}</p></div>
          <div><p className="text-xs uppercase text-[#6B7280]">Division</p><p className="font-semibold">{batch.collection_point_division || batch.city}</p></div>
          <div><p className="text-xs uppercase text-[#6B7280]">Price per kg</p><p className="font-semibold">{formatUGX(batch.recycler_sale_price_per_kg)}</p></div>
          <div><p className="text-xs uppercase text-[#6B7280]">Expected total</p><p className="font-semibold">{formatUGX(batch.expected_total_amount)}</p></div>
          <div><p className="text-xs uppercase text-[#6B7280]">Date created</p><p className="font-semibold">{batch.created_at ? new Date(batch.created_at).toLocaleString() : '—'}</p></div>
        </div>

        {batch.quality_notes && (
          <div>
            <p className="text-xs uppercase text-[#6B7280]">Quality notes</p>
            <p className="mt-1 text-sm text-[#374151]">{batch.quality_notes}</p>
          </div>
        )}

        {batch.pickup_instructions && (
          <div>
            <p className="text-xs uppercase text-[#6B7280]">Pickup instructions</p>
            <p className="mt-1 text-sm text-[#374151]">{batch.pickup_instructions}</p>
          </div>
        )}

        <div className="border-t border-[#E5E7EB] pt-4">
          <label className="block text-sm font-medium text-[#374151]">Requested kg</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            max={batch.available_kg}
            value={requestedKg}
            onChange={(e) => setRequestedKg(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#D1D5DB] px-3 py-2"
          />
          {message && <p className="mt-2 text-sm text-[#374151]">{message}</p>}
          <div className="mt-4 flex gap-3">
            <Button onClick={handleRequest} disabled={submitting}>Request purchase</Button>
            <Button variant="secondary" onClick={() => navigate('/recycler/inventory')}>Back</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

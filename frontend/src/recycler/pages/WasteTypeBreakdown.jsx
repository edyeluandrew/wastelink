import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { LoadingState, ErrorState, EmptyState, Button, Modal } from '../../components';
import { formatUGX } from '../../utils/formatters';

export default function WasteTypeBreakdown() {
  const { wasteTypeKey } = useParams();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestedKg, setRequestedKg] = useState('');
  const [recyclerNote, setRecyclerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/recycler/inventory-summary/${encodeURIComponent(wasteTypeKey)}/collection-points`
        );
        setPoints(res.data?.data?.collection_points || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [wasteTypeKey]);

  const openRequest = (point) => {
    setRequestTarget(point);
    setRequestedKg(String(point.available_kg));
    setRecyclerNote('');
    setMessage('');
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!requestTarget) return;
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/recycler/purchase-requests', {
        batch_id: requestTarget.batch_id,
        requested_kg: Number(requestedKg),
        recycler_note: recyclerNote || undefined,
      });
      setMessage('Request submitted successfully.');
      setRequestTarget(null);
      const res = await api.get(
        `/recycler/inventory-summary/${encodeURIComponent(wasteTypeKey)}/collection-points`
      );
      setPoints(res.data?.data?.collection_points || []);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading collection points..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const wasteTypeName = points[0]?.waste_type || decodeURIComponent(wasteTypeKey);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/recycler/inventory" className="text-sm text-[#238636]">← Back to waste types</Link>
        <h1 className="mt-2 text-2xl font-bold">{wasteTypeName}</h1>
        <p className="text-sm text-[#6B7280]">Available kg by collection point — request from one point at a time.</p>
      </div>

      {points.length === 0 ? (
        <EmptyState title="No inventory at collection points" description="This waste type may have been fully reserved or sold." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#D9D9D9] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Collection point</th>
                <th className="px-4 py-3">City / division</th>
                <th className="px-4 py-3">Available kg</th>
                <th className="px-4 py-3">Price/kg</th>
                <th className="px-4 py-3">Expected total</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.batch_id} className="border-b border-[#F3F4F6]">
                  <td className="px-4 py-3 font-medium">{point.collection_point_name}</td>
                  <td className="px-4 py-3">{point.city} · {point.division || '—'}</td>
                  <td className="px-4 py-3">{Number(point.available_kg).toFixed(1)}</td>
                  <td className="px-4 py-3">{formatUGX(point.recycler_sale_price_per_kg)}</td>
                  <td className="px-4 py-3">{formatUGX(point.expected_total_amount)}</td>
                  <td className="px-4 py-3">{point.updated_at ? new Date(point.updated_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" onClick={() => openRequest(point)}>Request purchase</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={Boolean(requestTarget)} onClose={() => setRequestTarget(null)} title="Request purchase">
        {requestTarget && (
          <form onSubmit={submitRequest} className="space-y-3">
            <p><strong>Waste type:</strong> {requestTarget.waste_type}</p>
            <p><strong>Collection point:</strong> {requestTarget.collection_point_name}</p>
            <p><strong>Available:</strong> {Number(requestTarget.available_kg).toFixed(1)} kg</p>
            <p><strong>Price/kg:</strong> {formatUGX(requestTarget.recycler_sale_price_per_kg)}</p>
            <div>
              <label className="text-sm font-medium">Requested kg</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                max={requestTarget.available_kg}
                value={requestedKg}
                onChange={(e) => setRequestedKg(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>
            <p className="text-sm text-[#6B7280]">
              Expected total: {formatUGX(Math.round(Number(requestedKg || 0) * requestTarget.recycler_sale_price_per_kg))}
            </p>
            <div>
              <label className="text-sm font-medium">Pickup note (optional)</label>
              <textarea
                value={recyclerNote}
                onChange={(e) => setRecyclerNote(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                rows={2}
                placeholder="Preferred pickup time or instructions"
              />
            </div>
            {message && <p className="text-sm">{message}</p>}
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit request'}</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}

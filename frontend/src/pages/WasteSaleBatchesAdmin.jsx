import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../api/axios';
import {
  Button, LoadingState, ErrorState, EmptyState, DataTable, Modal, StatusBadge, StatCard,
} from '../components';
import { formatUGX } from '../utils/formatters';

const initialForm = {
  waste_type: 'PLASTIC',
  collection_point_id: '',
  verified_kg: '',
  picker_price_per_kg_snapshot: '',
  recycler_sale_price_per_kg: '',
  quality_notes: '',
  pickup_instructions: '',
  price_override_reason: '',
  waste_log_ids: [],
};

export default function WasteSaleBatchesAdmin() {
  const [batches, setBatches] = useState([]);
  const [collectionPoints, setCollectionPoints] = useState([]);
  const [verifiedLogs, setVerifiedLogs] = useState([]);
  const [inventorySummary, setInventorySummary] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchRes, cpRes, summaryRes, revenueRes] = await Promise.all([
        api.get('/admin/waste-sale-batches'),
        api.get('/collection-points'),
        api.get('/admin/verified-inventory-summary'),
        api.get('/admin/recycler-revenue-summary'),
      ]);
      setBatches(batchRes.data?.data?.batches || []);
      setCollectionPoints(cpRes.data?.data || []);
      setInventorySummary(summaryRes.data?.data?.summary || []);
      setRevenue(revenueRes.data?.data?.summary || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const loadVerifiedLogs = async (collectionPointId) => {
    if (!collectionPointId) {
      setVerifiedLogs([]);
      return;
    }
    const res = await api.get(`/admin/verified-waste-logs?collection_point_id=${collectionPointId}`);
    setVerifiedLogs(res.data?.data?.logs || []);
  };

  const margin = () => {
    const picker = Number(form.picker_price_per_kg_snapshot || 0);
    const sale = Number(form.recycler_sale_price_per_kg || 0);
    return sale - picker;
  };

  const toggleLog = (log) => {
    const selected = new Set(form.waste_log_ids);
    if (selected.has(log.id)) selected.delete(log.id);
    else selected.add(log.id);

    const ids = [...selected];
    const selectedLogs = verifiedLogs.filter((entry) => ids.includes(entry.id));
    const totalKg = selectedLogs.reduce((sum, entry) => sum + Number(entry.verified_kg || 0), 0);
    const avgPickerPrice = selectedLogs.length
      ? Math.round(selectedLogs.reduce((sum, entry) => sum + Number(entry.picker_price_per_kg || 0), 0) / selectedLogs.length)
      : form.picker_price_per_kg_snapshot;

    setForm({
      ...form,
      waste_log_ids: ids,
      waste_type: selectedLogs[0]?.waste_type || form.waste_type,
      verified_kg: totalKg ? String(totalKg) : form.verified_kg,
      picker_price_per_kg_snapshot: avgPickerPrice ? String(avgPickerPrice) : form.picker_price_per_kg_snapshot,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/waste-sale-batches', {
        ...form,
        collection_point_id: Number(form.collection_point_id),
        verified_kg: Number(form.verified_kg),
        picker_price_per_kg_snapshot: Number(form.picker_price_per_kg_snapshot),
        recycler_sale_price_per_kg: Number(form.recycler_sale_price_per_kg),
        waste_log_ids: form.waste_log_ids,
      });
      setModalOpen(false);
      setForm(initialForm);
      setVerifiedLogs([]);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBatch = async (batch) => {
    if (batch.status !== 'AVAILABLE') {
      alert('Only available batches can be cancelled');
      return;
    }
    if (!window.confirm(`Cancel batch ${batch.batch_code}?`)) return;
    await api.patch(`/admin/waste-sale-batches/${batch.id}`, { status: 'CANCELLED' });
    fetchData();
  };

  if (loading) return <LoadingState message="Loading sale batches..." />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const columns = [
    { key: 'batch_code', label: 'Batch' },
    { key: 'waste_type', label: 'Type' },
    { key: 'collection_point_name', label: 'Collection point' },
    { key: 'verified_kg', label: 'Kg', render: (r) => Number(r.verified_kg).toFixed(1) },
    { key: 'recycler_sale_price_per_kg', label: 'Sale/kg', render: (r) => formatUGX(r.recycler_sale_price_per_kg) },
    { key: 'expected_total_amount', label: 'Expected', render: (r) => formatUGX(r.expected_total_amount) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => r.status === 'AVAILABLE' ? (
        <Button size="sm" variant="secondary" onClick={() => cancelBatch(r)}>Cancel</Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Waste Sale Batches</h1>
          <p className="text-sm text-[#6B7280]">Group verified inventory into sale batches for recyclers.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} className="mr-1 inline" /> Create batch</Button>
      </div>

      {revenue && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Sold batches" value={revenue.sold_batches || 0} />
          <StatCard title="Total revenue" value={formatUGX(revenue.total_revenue || 0)} />
          <StatCard title="Picker cost basis" value={formatUGX(revenue.picker_cost_basis || 0)} />
          <StatCard title="Gross margin" value={formatUGX(revenue.gross_margin || 0)} />
        </div>
      )}

      {inventorySummary.length > 0 && (
        <section className="rounded-3xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Unbatched verified inventory</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {inventorySummary.map((row) => (
              <div key={row.waste_type} className="rounded-xl bg-[#F9FAFB] px-3 py-2 text-sm">
                {row.waste_type}: {Number(row.verified_kg).toFixed(1)} kg
              </div>
            ))}
          </div>
        </section>
      )}

      {batches.length === 0 ? (
        <EmptyState title="No sale batches" description="Create a batch from verified waste inventory." />
      ) : (
        <DataTable columns={columns} data={batches} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create sale batch">
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.collection_point_id}
            onChange={(e) => {
              const value = e.target.value;
              setForm({ ...form, collection_point_id: value, waste_log_ids: [] });
              loadVerifiedLogs(value);
            }}
            required
          >
            <option value="">Select collection point</option>
            {collectionPoints.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name} ({cp.division})</option>
            ))}
          </select>

          {verifiedLogs.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border p-2 text-sm">
              <p className="mb-2 font-medium">Select verified waste logs (optional)</p>
              {verifiedLogs.map((log) => (
                <label key={log.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={form.waste_log_ids.includes(log.id)}
                    onChange={() => toggleLog(log)}
                  />
                  {log.job_code} · {log.waste_type} · {Number(log.verified_kg).toFixed(1)} kg
                </label>
              ))}
            </div>
          )}

          <input className="w-full rounded-lg border px-3 py-2" placeholder="Waste type" value={form.waste_type} onChange={(e) => setForm({ ...form, waste_type: e.target.value })} required />
          <input type="number" step="0.1" className="w-full rounded-lg border px-3 py-2" placeholder="Verified kg" value={form.verified_kg} onChange={(e) => setForm({ ...form, verified_kg: e.target.value })} required />
          <input type="number" className="w-full rounded-lg border px-3 py-2" placeholder="Picker price/kg snapshot" value={form.picker_price_per_kg_snapshot} onChange={(e) => setForm({ ...form, picker_price_per_kg_snapshot: e.target.value })} required />
          <input type="number" className="w-full rounded-lg border px-3 py-2" placeholder="Recycler sale price/kg" value={form.recycler_sale_price_per_kg} onChange={(e) => setForm({ ...form, recycler_sale_price_per_kg: e.target.value })} required />
          <p className="text-sm text-[#6B7280]">Gross margin/kg: {formatUGX(margin())}</p>
          {margin() < 0 && (
            <input className="w-full rounded-lg border px-3 py-2" placeholder="Override reason (required if sale < picker price)" value={form.price_override_reason} onChange={(e) => setForm({ ...form, price_override_reason: e.target.value })} />
          )}
          <textarea className="w-full rounded-lg border px-3 py-2" placeholder="Quality notes" value={form.quality_notes} onChange={(e) => setForm({ ...form, quality_notes: e.target.value })} />
          <textarea className="w-full rounded-lg border px-3 py-2" placeholder="Pickup instructions" value={form.pickup_instructions} onChange={(e) => setForm({ ...form, pickup_instructions: e.target.value })} />
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Publish as available'}</Button>
        </form>
      </Modal>
    </div>
  );
}

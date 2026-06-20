import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { LoadingState, ErrorState, EmptyState, StatusBadge, Button } from '../../components';
import { formatUGX } from '../../utils/formatters';

export default function AvailableInventory() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/recycler/inventory');
        setBatches(res.data?.data?.batches || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading inventory..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Available Waste Inventory</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Verified batches ready for purchase.</p>
      </div>

      {batches.length === 0 ? (
        <EmptyState title="No batches available" description="Check back later for verified waste listings." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#D9D9D9] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Kg</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Price/kg</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b border-[#F3F4F6]">
                  <td className="px-4 py-3 font-medium">{batch.batch_code}</td>
                  <td className="px-4 py-3">{batch.waste_type}</td>
                  <td className="px-4 py-3">{Number(batch.available_kg).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <div>{batch.collection_point_name}</div>
                    <div className="text-xs text-[#6B7280]">{batch.collection_point_division}</div>
                  </td>
                  <td className="px-4 py-3">{formatUGX(batch.recycler_sale_price_per_kg)}</td>
                  <td className="px-4 py-3">{formatUGX(batch.expected_total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={batch.status} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/recycler/inventory/${batch.id}`}>
                      <Button size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

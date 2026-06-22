import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { LoadingState, ErrorState, EmptyState, Button } from '../../components';
import { formatUGX } from '../../utils/formatters';

export default function AvailableInventory() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/recycler/inventory-summary');
        setSummary(res.data?.data?.summary || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading available waste..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Available Waste</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Verified waste matching your accepted types and approved city, grouped by waste type.
        </p>
      </div>

      {summary.length === 0 ? (
        <EmptyState
          title="No matching waste available"
          description="No verified batches match your accepted waste types and city yet."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#D9D9D9] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Waste type</th>
                <th className="px-4 py-3">Total kg</th>
                <th className="px-4 py-3">Collection points</th>
                <th className="px-4 py-3">Price/kg</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => {
                const priceLabel =
                  row.min_price_per_kg === row.max_price_per_kg
                    ? formatUGX(row.min_price_per_kg)
                    : `${formatUGX(row.min_price_per_kg)} – ${formatUGX(row.max_price_per_kg)}`;
                return (
                  <tr key={row.waste_type_key} className="border-b border-[#F3F4F6]">
                    <td className="px-4 py-3 font-medium">{row.waste_type_name}</td>
                    <td className="px-4 py-3">{Number(row.total_available_kg).toFixed(1)} kg</td>
                    <td className="px-4 py-3">{row.collection_point_count} point(s)</td>
                    <td className="px-4 py-3">{priceLabel}</td>
                    <td className="px-4 py-3">
                      <Link to={`/recycler/inventory/type/${encodeURIComponent(row.waste_type_key)}`}>
                        <Button size="sm">View collection points</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

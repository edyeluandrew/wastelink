import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { StatCard, LoadingState, ErrorState, Button } from '../../components';
import { formatUGX } from '../../utils/formatters';
import { Package, Layers, MapPin, ClipboardList, CheckCircle2, Clock3, Scale } from 'lucide-react';

export default function RecyclerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/recycler/dashboard');
        setData(res.data?.data || null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Recycler Overview</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          All verified waste for sale in {data?.profile?.city || 'your city'}. Browse batches and submit purchase requests.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Available kg" value={`${Number(stats.total_matched_available_kg || 0).toFixed(1)} kg`} icon={Package} shortTitle="Available" />
        <StatCard title="Waste types listed" value={stats.matched_waste_type_count || 0} icon={Layers} shortTitle="Types" />
        <StatCard title="Collection points" value={stats.matched_collection_point_count || 0} icon={MapPin} shortTitle="Points" />
        <StatCard title="Pending requests" value={stats.pending_requests || 0} icon={Clock3} shortTitle="Pending" />
        <StatCard title="Approved requests" value={stats.approved_requests || 0} icon={CheckCircle2} shortTitle="Approved" />
        <StatCard title="Completed purchases" value={stats.completed_purchases || 0} icon={CheckCircle2} shortTitle="Done" />
        <StatCard title="Total kg purchased" value={`${Number(stats.total_kg_purchased || 0).toFixed(1)} kg`} icon={Scale} shortTitle="Kg bought" />
        <StatCard title="Total spent" value={formatUGX(stats.total_amount_spent || 0)} icon={Scale} shortTitle="Spent" />
      </div>

      {(stats.summary_by_waste_type || []).length > 0 && (
        <section className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Available by waste type</h2>
          <div className="mt-4 space-y-2">
            {stats.summary_by_waste_type.map((row) => (
              <div key={row.waste_type_key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F9FAFB] px-4 py-3 text-sm">
                <span className="font-medium">{row.waste_type_name}</span>
                <span>{Number(row.total_available_kg).toFixed(1)} kg · {row.collection_point_count} point(s)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/recycler/inventory"><Button>Browse available waste</Button></Link>
        <Link to="/recycler/requests"><Button variant="secondary">View my requests</Button></Link>
      </div>
    </div>
  );
}

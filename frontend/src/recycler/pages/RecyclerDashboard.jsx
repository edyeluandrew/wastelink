import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { StatCard, LoadingState, ErrorState, Button } from '../../components';
import { formatUGX } from '../../utils/formatters';
import { Package, ClipboardList, CheckCircle2, Clock3, Scale, Wallet } from 'lucide-react';

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
  const availableTypes = stats.available_kg_by_waste_type || [];
  const totalAvailableKg = availableTypes.reduce((sum, row) => sum + Number(row.available_kg || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Recycler Overview</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Verified waste available for purchase and your request activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Available kg (all types)" value={`${totalAvailableKg.toFixed(1)} kg`} icon={Package} shortTitle="Available" />
        <StatCard title="Purchase requests" value={stats.total_purchase_requests || 0} icon={ClipboardList} shortTitle="Requests" />
        <StatCard title="Pending requests" value={stats.pending_requests || 0} icon={Clock3} shortTitle="Pending" />
        <StatCard title="Approved requests" value={stats.approved_requests || 0} icon={CheckCircle2} shortTitle="Approved" />
        <StatCard title="Completed purchases" value={stats.completed_purchases || 0} icon={CheckCircle2} shortTitle="Done" />
        <StatCard title="Total kg purchased" value={`${Number(stats.total_kg_purchased || 0).toFixed(1)} kg`} icon={Scale} shortTitle="Kg bought" />
        <StatCard title="Total amount spent" value={formatUGX(stats.total_amount_spent || 0)} icon={Wallet} shortTitle="Spent" />
      </div>

      {availableTypes.length > 0 && (
        <section className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111111]">Available kg by waste type</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableTypes.map((row) => (
              <div key={row.waste_type} className="rounded-2xl bg-[#F9FAFB] px-4 py-3">
                <p className="text-sm text-[#6B7280]">{row.waste_type}</p>
                <p className="text-xl font-bold text-[#111111]">{Number(row.available_kg).toFixed(1)} kg</p>
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

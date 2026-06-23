import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../../components';
import { formatUGX, formatDateTime } from '../../utils/formatters';

export default function PurchaseRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/recycler/purchase-requests');
        setRequests(res.data?.data?.requests || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading requests..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">My Purchase Requests</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Track status of your batch purchase requests.</p>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No requests yet" description="Browse available waste and submit a purchase request." />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <article key={req.id} className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#6B7280]">{req.request_code}</p>
                  <h2 className="text-lg font-semibold">{req.waste_type} · {req.batch_code}</h2>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div><span className="text-[#6B7280]">Requested kg:</span> {Number(req.requested_kg).toFixed(1)}</div>
                <div><span className="text-[#6B7280]">Expected:</span> {formatUGX(req.expected_amount)}</div>
                <div><span className="text-[#6B7280]">Location:</span> {req.collection_point_name}</div>
                {req.pickup_date && (
                  <div>
                    <span className="text-[#6B7280]">
                      {req.status === 'PENDING' ? 'Preferred pickup:' : 'Pickup:'}
                    </span>{' '}
                    {formatDateTime(req.pickup_date)}
                  </div>
                )}
                {req.recycler_note && (
                  <div className="col-span-2"><span className="text-[#6B7280]">Note:</span> {req.recycler_note}</div>
                )}
              </div>
              {req.admin_response && (
                <p className="mt-3 rounded-xl bg-[#F9FAFB] px-3 py-2 text-sm text-[#374151]">{req.admin_response}</p>
              )}
              {req.rejection_reason && (
                <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">{req.rejection_reason}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

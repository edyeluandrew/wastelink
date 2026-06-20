import { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  Button, LoadingState, ErrorState, EmptyState, StatusBadge,
} from '../components';
import { formatUGX } from '../utils/formatters';

export default function RecyclerPurchaseRequestsAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionState, setActionState] = useState({});

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/recycler-purchase-requests');
      setRequests(res.data?.data?.requests || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const runAction = async (id, action, body = {}) => {
    setActionState((s) => ({ ...s, [id]: action }));
    try {
      await api.post(`/admin/recycler-purchase-requests/${id}/${action}`, body);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionState((s) => ({ ...s, [id]: null }));
    }
  };

  if (loading) return <LoadingState message="Loading purchase requests..." />;
  if (error) return <ErrorState error={error} onRetry={fetchRequests} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recycler Purchase Requests</h1>
        <p className="text-sm text-[#6B7280]">Approve, schedule pickup, confirm kg, record payment, and mark sold.</p>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No purchase requests" description="Recycler requests will appear here." />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <article key={req.id} className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#6B7280]">{req.request_code} · Recycler #{req.recycler_id}</p>
                  <h2 className="text-lg font-semibold">{req.waste_type} · {req.batch_code}</h2>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>Requested: {Number(req.requested_kg).toFixed(1)} kg</div>
                <div>Expected: {formatUGX(req.expected_amount)}</div>
                <div>{req.collection_point_name}</div>
                {req.final_kg != null && <div>Final kg: {Number(req.final_kg).toFixed(1)}</div>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {req.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => runAction(req.id, 'approve', { admin_response: 'Approved' })} disabled={actionState[req.id]}>Approve</Button>
                    <Button size="sm" variant="secondary" onClick={() => runAction(req.id, 'reject', { rejection_reason: 'Not available' })} disabled={actionState[req.id]}>Reject</Button>
                  </>
                )}
                {req.status === 'APPROVED' && req.final_kg == null && (
                  <>
                    <Button size="sm" onClick={() => runAction(req.id, 'schedule-pickup', { pickup_date: new Date().toISOString() })} disabled={actionState[req.id]}>Schedule pickup</Button>
                    <Button size="sm" onClick={() => {
                      const finalKg = window.prompt('Final pickup kg', String(req.requested_kg));
                      if (finalKg) runAction(req.id, 'confirm-pickup', { final_kg: Number(finalKg) });
                    }} disabled={actionState[req.id]}>Confirm pickup kg</Button>
                  </>
                )}
                {req.final_kg != null && req.status !== 'COMPLETED' && (
                  <>
                    <Button size="sm" onClick={() => {
                      const ref = window.prompt('Payment reference', `PAY-${req.id}`);
                      runAction(req.id, 'record-payment', {
                        payment_method: 'MOBILE_MONEY',
                        payment_reference: ref,
                        amount: req.final_amount,
                      });
                    }} disabled={actionState[req.id]}>Record payment</Button>
                    <Button size="sm" onClick={() => runAction(req.id, 'mark-sold')} disabled={actionState[req.id]}>Mark sold</Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

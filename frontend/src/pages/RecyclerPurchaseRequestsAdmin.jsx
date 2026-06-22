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
  const [busyKey, setBusyKey] = useState(null);

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
    const key = `${id}:${action}`;
    setBusyKey(key);
    try {
      if (action === 'confirm-pickup') {
        const finalKg = window.prompt('Final pickup kg', String(body.defaultKg || ''));
        if (!finalKg) return;
        body = { final_kg: Number(finalKg) };
      }
      if (action === 'record-payment') {
        const ref = window.prompt('Payment reference', body.defaultRef || `PAY-${id}`);
        if (ref === null) return;
        body = {
          payment_method: 'MOBILE_MONEY',
          payment_reference: ref,
          amount: body.amount,
        };
      }
      await api.post(`/admin/recycler-purchase-requests/${id}/${action}`, body);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setBusyKey(null);
    }
  };

  const isBusy = (id, action) => busyKey === `${id}:${action}`;

  if (loading) return <LoadingState message="Loading purchase requests..." />;
  if (error) return <ErrorState error={error} onRetry={fetchRequests} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recycler Purchase Requests</h1>
        <p className="text-sm text-[#6B7280]">Approve, schedule pickup, confirm kg, record payment, and complete.</p>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No purchase requests" description="Recycler requests will appear here." />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <article key={req.id} className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#6B7280]">{req.request_code}</p>
                  <h2 className="text-lg font-semibold">{req.recycler_company_name || `Recycler #${req.recycler_id}`}</h2>
                  <p className="text-sm">{req.waste_type} · {req.batch_code} · {req.collection_point_name}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>Requested: {Number(req.requested_kg).toFixed(1)} kg</div>
                <div>Expected: {formatUGX(req.expected_amount)}</div>
                {req.recycler_note && <div className="col-span-2">Note: {req.recycler_note}</div>}
                {req.final_kg != null && <div>Final kg: {Number(req.final_kg).toFixed(1)}</div>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {req.status === 'PENDING' && (
                  <>
                    <Button size="sm" disabled={Boolean(busyKey)} onClick={() => runAction(req.id, 'approve', { admin_response: 'Approved' })}>
                      {isBusy(req.id, 'approve') ? 'Working...' : 'Approve'}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={Boolean(busyKey)} onClick={() => runAction(req.id, 'reject', { rejection_reason: 'Not available' })}>
                      {isBusy(req.id, 'reject') ? 'Working...' : 'Reject'}
                    </Button>
                  </>
                )}
                {req.status === 'APPROVED' && req.final_kg == null && (
                  <>
                    <Button size="sm" disabled={Boolean(busyKey)} onClick={() => runAction(req.id, 'schedule-pickup', { pickup_date: new Date().toISOString() })}>
                      {isBusy(req.id, 'schedule-pickup') ? 'Working...' : 'Schedule pickup'}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={Boolean(busyKey)} onClick={() => runAction(req.id, 'confirm-pickup', { defaultKg: req.requested_kg })}>
                      {isBusy(req.id, 'confirm-pickup') ? 'Working...' : 'Confirm pickup kg'}
                    </Button>
                  </>
                )}
                {req.final_kg != null && req.status !== 'COMPLETED' && (
                  <>
                    <Button size="sm" disabled={Boolean(busyKey)} onClick={() => runAction(req.id, 'record-payment', { amount: req.final_amount, defaultRef: `PAY-${req.id}` })}>
                      {isBusy(req.id, 'record-payment') ? 'Working...' : 'Record payment'}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={Boolean(busyKey)} onClick={() => runAction(req.id, 'mark-sold')}>
                      {isBusy(req.id, 'mark-sold') ? 'Working...' : 'Complete sale'}
                    </Button>
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

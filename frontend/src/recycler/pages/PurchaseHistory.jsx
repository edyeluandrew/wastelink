import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { LoadingState, ErrorState, EmptyState, Button, Modal } from '../../components';
import { formatUGX } from '../../utils/formatters';

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/recycler/purchases');
        setPurchases(res.data?.data?.purchases || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const viewReceipt = async (requestId) => {
    const res = await api.get(`/recycler/purchases/${requestId}/receipt`);
    setReceipt(res.data?.data?.receipt || null);
  };

  const downloadReceipt = async (requestId) => {
    const res = await api.get(`/recycler/purchases/${requestId}/receipt`);
    const data = res.data?.data?.receipt;
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.receipt_id || 'receipt'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState message="Loading purchase history..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Purchase History</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Completed purchases and payment records.</p>
      </div>

      {purchases.length === 0 ? (
        <EmptyState title="No completed purchases" description="Completed purchases will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-[#D9D9D9] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Final kg</th>
                <th className="px-4 py-3">Amount paid</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Pickup date</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-[#F3F4F6]">
                  <td className="px-4 py-3">{p.request_code}</td>
                  <td className="px-4 py-3">{p.batch_code}</td>
                  <td className="px-4 py-3">{p.final_kg != null ? Number(p.final_kg).toFixed(1) : '—'}</td>
                  <td className="px-4 py-3">{formatUGX(p.final_amount || 0)}</td>
                  <td className="px-4 py-3">{p.payment_method || '—'}</td>
                  <td className="px-4 py-3">{p.payment_reference || '—'}</td>
                  <td className="px-4 py-3">{p.pickup_date ? new Date(p.pickup_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => viewReceipt(p.id)}>View</Button>
                      <Button size="sm" onClick={() => downloadReceipt(p.id)}>Download</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Purchase receipt">
        {receipt && (
          <div className="space-y-2 text-sm">
            <p><strong>Receipt:</strong> {receipt.receipt_id}</p>
            <p><strong>Company:</strong> {receipt.company_name}</p>
            <p><strong>Batch:</strong> {receipt.batch_code}</p>
            <p><strong>Waste type:</strong> {receipt.waste_type}</p>
            <p><strong>Collection point:</strong> {receipt.collection_point} ({receipt.division})</p>
            <p><strong>Final kg:</strong> {receipt.final_kg}</p>
            <p><strong>Amount:</strong> {formatUGX(receipt.final_amount)}</p>
            <p><strong>Payment:</strong> {receipt.payment_method} · {receipt.payment_reference}</p>
            <p><strong>Pickup:</strong> {receipt.pickup_date ? new Date(receipt.pickup_date).toLocaleString() : '—'}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

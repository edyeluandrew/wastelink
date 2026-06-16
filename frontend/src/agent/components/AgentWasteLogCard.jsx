import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge, Modal } from '../../components';
import { getEarningAmount, getEarningStatus } from '../../utils/earningsHelper';
import { formatDateTime, formatUGX } from '../../utils/formatters';
import { getEstimatedKg, getVerifiedKg, hasVerifiedKg } from '../../utils/wasteLogHelpers';

export default function AgentWasteLogCard({
  log,
  showActions = true,
  onVerify,
  onReject,
  isProcessing = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [verifyModal, setVerifyModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [verifiedKg, setVerifiedKg] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleVerifySubmit = async () => {
    if (!verifiedKg || parseFloat(verifiedKg) <= 0) {
      alert('Verified weight must be greater than 0');
      return;
    }
    setProcessing(true);
    try {
      await onVerify(log.id, {
        verified_kg: parseFloat(verifiedKg),
        notes: notes.trim(),
      });
      setVerifyModal(false);
      setVerifiedKg('');
      setNotes('');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    setProcessing(true);
    try {
      await onReject(log.id, {
        rejection_reason: rejectReason.trim() || 'No reason provided',
      });
      setRejectModal(false);
      setRejectReason('');
    } finally {
      setProcessing(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return parseFloat(num).toFixed(2);
  };

  const estimatedKg = getEstimatedKg(log);
  const verifiedKgValue = getVerifiedKg(log);
  const earningAmount = getEarningAmount(log);
  const earningStatus = getEarningStatus(log);

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-[#D9D9D9] bg-white shadow-sm transition hover:shadow-md">
        <button
          type="button"
          className="w-full p-4 text-left transition hover:bg-[#F8F9FA]"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="break-all font-bold text-[#111111]">{log.job_code}</p>
                <StatusBadge status={log.status} />
              </div>
              <p className="mt-1 text-sm text-[#6B7280]">
                {log.picker_name || 'Unknown Picker'} · {log.waste_type || 'N/A'}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                Est. {formatNumber(estimatedKg)} kg · {log.collection_point_name || 'Unknown location'}
              </p>
            </div>
            <div className="shrink-0 text-[#6B7280]">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-[#D9D9D9] bg-[#F8F9FA] p-4">
            <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Picker Name</p>
                <p className="mt-1 font-semibold text-[#111111]">{log.picker_name || 'N/A'}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Picker Phone</p>
                <p className="mt-1 font-semibold text-[#111111]">{log.picker_phone || 'N/A'}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Waste Type</p>
                <p className="mt-1 font-semibold text-[#111111]">{log.waste_type || 'N/A'}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Status</p>
                <p className="mt-1 font-semibold text-[#111111]">{log.status || 'N/A'}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Estimated (Picker)</p>
                <p className="mt-1 font-semibold text-[#111111]">{formatNumber(estimatedKg)} kg</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Verified (Agent)</p>
                <p className="mt-1 font-semibold text-[#111111]">
                  {hasVerifiedKg(log) ? `${formatNumber(verifiedKgValue)} kg` : 'Pending'}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Collection Point</p>
                <p className="mt-1 font-semibold text-[#111111]">
                  {log.collection_point_name || 'N/A'}
                  {log.division ? ` (${log.division})` : ''}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Submitted</p>
                <p className="mt-1 font-semibold text-[#111111]">
                  {formatDateTime(log.logged_at || log.created_at)}
                </p>
              </div>
              {earningAmount > 0 && (
                <div className="rounded-2xl bg-[#EAF6EA] p-3 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#238636]">Earnings</p>
                  <p className="mt-1 font-bold text-[#238636]">{formatUGX(earningAmount)}</p>
                  <p className="mt-1 text-xs text-[#238636]">Status: {earningStatus}</p>
                </div>
              )}
            </div>

            {showActions && log.status === 'PENDING' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setVerifyModal(true)}
                  disabled={isProcessing}
                  className="flex-1 rounded-2xl bg-[#238636] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2F9E44] disabled:bg-[#9CA3AF]"
                >
                  Verify Weight
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModal(true)}
                  disabled={isProcessing}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:bg-[#9CA3AF]"
                >
                  Reject
                </button>
              </div>
            )}

            {showActions && log.status !== 'PENDING' && (
              <p className="text-sm italic text-[#6B7280]">
                {log.status === 'VERIFIED' && 'This waste has been verified.'}
                {log.status === 'REJECTED' && 'This waste was rejected.'}
                {log.status === 'PAID' && 'This waste has been verified and paid.'}
              </p>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={verifyModal} title="Verify Waste Weight" onClose={() => !processing && setVerifyModal(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#F8F9FA] p-4">
            <label className="block text-sm font-semibold text-[#6B7280]">Estimated Weight (Picker)</label>
            <p className="text-2xl font-bold text-[#111111]">{formatNumber(estimatedKg)} kg</p>
            <p className="mt-1 text-xs text-[#6B7280]">Enter the actual verified weight below.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#111111]">Actual Verified Weight (kg) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={verifiedKg}
              onChange={(e) => setVerifiedKg(e.target.value)}
              placeholder="Enter verified weight"
              className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-base focus:border-[#238636] focus:outline-none focus:ring-2 focus:ring-[#238636]/20"
              disabled={processing}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#111111]">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Minor debris removed"
              className="h-24 w-full resize-none rounded-2xl border border-[#D9D9D9] px-4 py-3 text-base focus:border-[#238636] focus:outline-none focus:ring-2 focus:ring-[#238636]/20"
              disabled={processing}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleVerifySubmit}
              disabled={processing || !verifiedKg}
              className="flex-1 rounded-2xl bg-[#238636] px-4 py-3 font-semibold text-white transition hover:bg-[#2F9E44] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            >
              {processing ? 'Verifying...' : 'Confirm Verification'}
            </button>
            <button
              type="button"
              onClick={() => !processing && setVerifyModal(false)}
              disabled={processing}
              className="flex-1 rounded-2xl bg-[#E5E7EB] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#D1D5DB] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={rejectModal} title="Reject Waste Delivery" onClose={() => !processing && setRejectModal(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#F8F9FA] p-4 text-sm text-[#6B7280]">
            <p>Job Code: <span className="font-semibold text-[#111111]">{log.job_code}</span></p>
            <p className="mt-1">Waste: <span className="font-semibold text-[#111111]">{log.waste_type}</span></p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#111111]">Rejection Reason (Optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Contaminated, wrong waste type"
              className="h-24 w-full resize-none rounded-2xl border border-[#D9D9D9] px-4 py-3 text-base focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              disabled={processing}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={processing}
              className="flex-1 rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
            <button
              type="button"
              onClick={() => !processing && setRejectModal(false)}
              disabled={processing}
              className="flex-1 rounded-2xl bg-[#E5E7EB] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#D1D5DB] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

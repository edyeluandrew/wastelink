import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge, Button, Modal } from '../../components';
import { getEarningAmount, getEarningStatus } from '../../utils/earningsHelper';
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden hover:shadow-md transition">
        <div
          className="p-4 cursor-pointer hover:bg-gray-50 transition"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900 text-sm break-all">{log.job_code}</p>
                <StatusBadge status={log.status} />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {log.picker_name || 'Unknown Picker'} • {log.waste_type || 'N/A'} • {formatNumber(estimatedKg)} kg
              </p>
              <p className="text-xs text-gray-500 mt-1">{formatDate(log.created_at)}</p>
            </div>
            <div className="text-gray-600">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="p-4 border-t border-gray-300 bg-gray-50">
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <p className="text-xs text-gray-600">Picker Contact</p>
                <p className="font-semibold text-gray-900">{log.picker_phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Waste Type</p>
                <p className="font-semibold text-gray-900">{log.waste_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Logged Weight</p>
                <p className="font-semibold text-gray-900">{formatNumber(estimatedKg)} kg</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Verified Weight</p>
                <p className="font-semibold text-gray-900">{hasVerifiedKg(log) ? formatNumber(verifiedKgValue) + ' kg' : 'Pending'}</p>
              </div>
              {earningAmount > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-600">Earnings Generated</p>
                  <p className="font-semibold text-green-700">{earningAmount.toLocaleString()} UGX</p>
                  <p className="text-xs text-green-700 mt-1">Status: {earningStatus}</p>
                </div>
              )}
            </div>

            {showActions && log.status === 'PENDING' && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setVerifyModal(true)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition text-sm font-semibold"
                >
                  Verify Weight
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 transition text-sm font-semibold"
                >
                  Reject
                </button>
              </div>
            )}

            {showActions && log.status !== 'PENDING' && (
              <p className="text-xs text-gray-600 italic">
                {log.status === 'VERIFIED' && 'This waste has been verified.'}
                {log.status === 'REJECTED' && 'This waste was rejected.'}
                {log.status === 'PAID' && 'This waste has been verified and paid.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      <Modal isOpen={verifyModal} title="Verify Waste Weight" onClose={() => !processing && setVerifyModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Logged Weight
            </label>
            <p className="text-2xl font-bold text-gray-700">{formatNumber(estimatedKg)} kg</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Actual Verified Weight (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={verifiedKg}
              onChange={(e) => setVerifiedKg(e.target.value)}
              placeholder="Enter verified weight"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-600"
              disabled={processing}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Minor debris removed"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-600 resize-none h-20"
              disabled={processing}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleVerifySubmit}
              disabled={processing || !verifiedKg}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
            >
              {processing ? 'Verifying...' : 'Confirm Verification'}
            </button>
            <button
              onClick={() => !processing && setVerifyModal(false)}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 disabled:opacity-50 transition font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModal} title="Reject Waste Delivery" onClose={() => !processing && setRejectModal(false)}>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              Job Code: <span className="font-semibold">{log.job_code}</span>
            </p>
            <p className="text-sm text-gray-600">
              Waste: <span className="font-semibold">{log.waste_type}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Rejection Reason (Optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Contaminated, Wrong waste type, Quality issues"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-red-600 resize-none h-20"
              disabled={processing}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRejectSubmit}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
            <button
              onClick={() => !processing && setRejectModal(false)}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 disabled:opacity-50 transition font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

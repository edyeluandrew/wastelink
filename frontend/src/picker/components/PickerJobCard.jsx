import { formatDate, formatUGX } from '../../utils/formatters';
import { getEarningAmount, getJobPaymentDisplayStatus, getWalletAmount, getWithdrawnAmount } from '../../utils/earningsHelper';
import { MapPin, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react';

export default function PickerJobCard({ job }) {
  const earned = job.earning ? getEarningAmount(job) : 0;
  const withdrawn = job.earning ? getWithdrawnAmount(job) : 0;
  const inWallet = job.earning ? getWalletAmount(job) : 0;
  const displayStatus = getJobPaymentDisplayStatus(job);
  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-900">Job Code: {job.job_code}</p>
          <p className="text-sm text-gray-600">{job.waste_type}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-500">Status</p>
          <p className={`text-sm font-semibold ${
            displayStatus === 'PENDING' ? 'text-amber-700' :
            displayStatus === 'VERIFIED' || displayStatus === 'AVAILABLE' ? 'text-green-700' :
            displayStatus === 'REJECTED' ? 'text-red-700' :
            'text-blue-700'
          }`}>
            {displayStatus}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Estimated</p>
          <p className="text-lg font-semibold text-gray-900">{job.estimated_kg} kg</p>
        </div>
        {job.verified_kg !== null && job.verified_kg !== undefined && (
          <div>
            <p className="text-xs text-gray-500">Verified</p>
            <p className="text-lg font-semibold text-green-700">{job.verified_kg} kg</p>
          </div>
        )}
        {job.status === 'PENDING' && job.estimated_amount > 0 && (
          <div className="col-span-2">
            <p className="text-xs text-amber-600">Estimated earning (pending verification)</p>
            <p className="text-lg font-semibold text-amber-700">{formatUGX(job.estimated_amount)}</p>
          </div>
        )}
        {job.earning && (
          <div className="col-span-2 space-y-1">
            <p className="text-xs text-gray-500">Earned (verified)</p>
            <p className="text-lg font-semibold text-green-700">{formatUGX(earned)}</p>
            {(withdrawn > 0 || inWallet > 0) && (
              <p className="text-xs text-gray-600">
                Withdrawn {formatUGX(withdrawn)} · In wallet {formatUGX(inWallet)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{job.collection_point_name}</span>
          </div>
          <p className="text-xs text-gray-500">{formatDate(job.logged_at)}</p>
        </div>

        {job.status === 'PENDING' && (
          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Waiting for verification at collection point
          </p>
        )}
        {job.status === 'VERIFIED' && (
          <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Verified and earnings calculated
          </p>
        )}
        {job.status === 'REJECTED' && (
          <p className="text-xs text-red-700 mt-2 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Not accepted - {job.rejection_reason || 'See agent for details'}
          </p>
        )}
        {(displayStatus === 'PAID' || job.status === 'PAID') && (
          <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Payment completed
          </p>
        )}
      </div>
    </div>
  );
}

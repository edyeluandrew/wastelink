import { StatusBadge } from '../../components';
import { formatDate, formatUGX } from '../../utils/formatters';

export default function PickerJobCard({ job }) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-gray-900">Job Code: {job.job_code}</p>
          <p className="text-sm text-gray-600">{job.waste_type}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-600">Estimated</p>
          <p className="font-semibold">{job.estimated_kg || 0} kg</p>
        </div>
        {job.verified_kg && (
          <div>
            <p className="text-xs text-gray-600">Verified</p>
            <p className="font-semibold">{job.verified_kg} kg</p>
          </div>
        )}
      </div>

      {job.collection_point_name && (
        <p className="text-xs text-gray-600 mb-2">
          📍 {job.collection_point_name}
        </p>
      )}

      {job.earning && (
        <div className="text-sm font-semibold text-green-700 mb-2">
          Earning: {formatUGX(job.earning.amount || 0)}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {formatDate(job.logged_at || new Date())}
      </p>

      {job.status === 'PENDING' && (
        <p className="text-xs text-amber-700 mt-2 font-medium">
          ⏳ Waiting for verification at collection point
        </p>
      )}
      {job.status === 'VERIFIED' && (
        <p className="text-xs text-green-700 mt-2 font-medium">
          ✅ Verified and earnings calculated
        </p>
      )}
      {job.status === 'REJECTED' && (
        <p className="text-xs text-red-700 mt-2 font-medium">
          ❌ Not accepted - {job.rejection_reason || 'See agent for details'}
        </p>
      )}
      {job.status === 'PAID' && (
        <p className="text-xs text-blue-700 mt-2 font-medium">
          💳 Payment completed
        </p>
      )}
    </div>
  );
}

#!/usr/bin/env python3
import os

os.chdir('/home/localhost8081/wastelink/frontend/src/picker')

# 3. PickerStatCard
with open('components/PickerStatCard.jsx', 'w') as f:
    f.write("""import { Clock, CheckCircle, CreditCard, Scale } from 'lucide-react';

const iconMap = {
  '⏳': Clock,
  '✅': CheckCircle,
  '💳': CreditCard,
  '⚖️': Scale,
};

export default function PickerStatCard({ icon, label, value, color = 'green' }) {
  const IconComponent = iconMap[icon];

  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className={`border p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {IconComponent && <IconComponent className="w-6 h-6" />}
      </div>
    </div>
  );
}
""")
print('✓ Updated PickerStatCard.jsx')

# 4. PickerJobCard
with open('components/PickerJobCard.jsx', 'w') as f:
    f.write("""import { formatDate, formatUGX } from '../../utils/formatters';
import { MapPin, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react';

export default function PickerJobCard({ job }) {
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
            job.status === 'PENDING' ? 'text-amber-700' :
            job.status === 'VERIFIED' ? 'text-green-700' :
            job.status === 'REJECTED' ? 'text-red-700' :
            'text-blue-700'
          }`}>
            {job.status}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Estimated</p>
          <p className="text-lg font-semibold text-gray-900">{job.estimated_kg} kg</p>
        </div>
        {job.verified_kg !== null && (
          <div>
            <p className="text-xs text-gray-500">Verified</p>
            <p className="text-lg font-semibold text-green-700">{job.verified_kg} kg</p>
          </div>
        )}
        {job.earning && (
          <div>
            <p className="text-xs text-gray-500">Earning</p>
            <p className="text-lg font-semibold text-green-700">{formatUGX(job.earning.amount)}</p>
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
        {job.status === 'PAID' && (
          <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> Payment completed
          </p>
        )}
      </div>
    </div>
  );
}
""")
print('✓ Updated PickerJobCard.jsx')

# 5. CollectionPointCard
with open('components/CollectionPointCard.jsx', 'w') as f:
    f.write("""import { MapPin, User, Phone } from 'lucide-react';

export default function CollectionPointCard({ point }) {
  return (
    <div className="border border-gray-300 rounded-lg p-4 space-y-2 bg-white hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{point.name}</h3>
          <p className="text-xs text-gray-500">Code: {point.point_code}</p>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-gray-600 flex items-center gap-2"><MapPin className="w-4 h-4" /> Division: {point.division}</p>
        <p className="text-gray-600 flex items-center gap-2"><User className="w-4 h-4" /> Agent: {point.agent_name}</p>
        <p className="text-gray-600 flex items-center gap-2"><Phone className="w-4 h-4" /> {point.agent_phone}</p>
      </div>
      <button className="w-full mt-3 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition">
        Choose this point when logging your waste
      </button>
    </div>
  );
}
""")
print('✓ Updated CollectionPointCard.jsx')

print('\n✓ All 5 components updated with lucide-react icons!')

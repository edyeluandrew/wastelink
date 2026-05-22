import { StatusBadge } from '../../components';

export default function CollectionPointCard({ point }) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-gray-900">{point.name}</p>
          <p className="text-sm text-gray-600">Code: {point.point_code}</p>
        </div>
        <StatusBadge status={point.status} />
      </div>

      <div className="space-y-1 text-sm mb-2">
        {point.division && (
          <p className="text-gray-600">📍 Division: {point.division}</p>
        )}
        {point.agent_name && (
          <p className="text-gray-600">👤 Agent: {point.agent_name}</p>
        )}
        {point.agent_phone && (
          <p className="text-gray-600">📞 {point.agent_phone}</p>
        )}
      </div>

      <div className="text-xs text-gray-500 border-t border-gray-200 pt-2">
        Choose this point when logging your waste
      </div>
    </div>
  );
}

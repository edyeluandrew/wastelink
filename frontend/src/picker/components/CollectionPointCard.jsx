import { MapPin, User, Phone } from 'lucide-react';

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

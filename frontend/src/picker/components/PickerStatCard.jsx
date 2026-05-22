import { Clock, CheckCircle, CreditCard, Scale } from 'lucide-react';

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

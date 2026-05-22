export default function PickerStatCard({ icon, label, value, color = 'green' }) {
  const colorClasses = {
    green: 'bg-green-100 border-green-300 text-green-700',
    blue: 'bg-blue-100 border-blue-300 text-blue-700',
    amber: 'bg-amber-100 border-amber-300 text-amber-700',
    red: 'bg-red-100 border-red-300 text-red-700',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

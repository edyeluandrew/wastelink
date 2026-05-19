export default function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-wastelink-muted text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold text-wastelink-dark">{value}</p>
          {subtitle && <p className="text-wastelink-muted text-xs mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="ml-4 p-3 bg-wastelink-success rounded-lg">
            <Icon size={24} className="text-wastelink-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

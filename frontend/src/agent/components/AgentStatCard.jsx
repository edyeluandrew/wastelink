import React from 'react';

export default function AgentStatCard({ icon, label, value, color = 'green' }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-300',
    amber: 'bg-amber-50 border-amber-300',
    blue: 'bg-blue-50 border-blue-300',
    red: 'bg-red-50 border-red-300',
  };

  const textColorClasses = {
    green: 'text-green-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    red: 'text-red-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]} transition hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 ${textColorClasses[color]}`}>
          {icon ? React.createElement(icon, { size: 22, strokeWidth: 2.2 }) : null}
        </div>
        <div>
          <p className="text-xs text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${textColorClasses[color]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

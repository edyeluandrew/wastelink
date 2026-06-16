import React from 'react';

const colorClasses = {
  green: {
    card: 'border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_80%)]',
    icon: 'text-[#238636] bg-white/80',
    value: 'text-[#238636]',
  },
  amber: {
    card: 'border-[#FFD966] bg-[linear-gradient(135deg,#FFF9E6_0%,#FFFFFF_80%)]',
    icon: 'text-[#B45309] bg-white/80',
    value: 'text-[#B45309]',
  },
  blue: {
    card: 'border-[#BFDBFE] bg-[linear-gradient(135deg,#EFF6FF_0%,#FFFFFF_80%)]',
    icon: 'text-[#2563EB] bg-white/80',
    value: 'text-[#2563EB]',
  },
  red: {
    card: 'border-[#FECACA] bg-[linear-gradient(135deg,#FEF2F2_0%,#FFFFFF_80%)]',
    icon: 'text-[#DC2626] bg-white/80',
    value: 'text-[#DC2626]',
  },
};

export default function AgentStatCard({ icon, label, value, color = 'green' }) {
  const palette = colorClasses[color] || colorClasses.green;

  return (
    <div className={`rounded-3xl border p-4 shadow-sm transition hover:shadow-md ${palette.card}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}>
          {icon ? React.createElement(icon, { size: 22, strokeWidth: 2.2 }) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</p>
          <p className={`truncate text-xl font-bold md:text-2xl ${palette.value}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

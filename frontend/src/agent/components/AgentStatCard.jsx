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

export default function AgentStatCard({ icon, label, shortLabel, value, color = 'green' }) {
  const palette = colorClasses[color] || colorClasses.green;
  const mobileLabel = shortLabel || label;

  return (
    <div className={`rounded-3xl border p-3 shadow-sm sm:p-4 ${palette.card}`}>
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${palette.icon}`}>
          {icon ? React.createElement(icon, { size: 20, strokeWidth: 2.2 }) : null}
        </div>
        <div className="min-w-0 w-full">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] sm:hidden">
            {mobileLabel}
          </p>
          <p className="hidden text-xs font-semibold uppercase tracking-wide text-[#6B7280] sm:block">
            {label}
          </p>
          <p className={`mt-0.5 break-words text-lg font-bold leading-tight sm:text-2xl ${palette.value}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

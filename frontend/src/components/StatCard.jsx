export default function StatCard({ title, value, subtitle, icon: Icon, shortTitle }) {
  return (
    <div className="rounded-3xl border border-[#D9D9D9] bg-white p-4 shadow-sm transition hover:shadow-md md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] sm:hidden">
            {shortTitle || title}
          </p>
          <p className="hidden text-sm text-[#6B7280] sm:block">{title}</p>
          <p className="mt-1 break-words text-2xl font-bold leading-tight text-[#111111] md:text-3xl">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-[#6B7280]">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF6EA]">
            <Icon size={22} className="text-[#238636]" />
          </div>
        )}
      </div>
    </div>
  );
}

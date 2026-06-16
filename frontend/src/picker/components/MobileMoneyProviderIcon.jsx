const PROVIDER_META = {
  MTN: {
    src: '/providers/mtn.svg',
    label: 'MTN Mobile Money',
    bg: '#FFEB99',
  },
  AIRTEL: {
    src: '/providers/airtel.svg',
    label: 'Airtel Money',
    bg: '#FFE0E0',
  },
};

export default function MobileMoneyProviderIcon({
  provider,
  size = 'md',
  showLabel = false,
  className = '',
}) {
  const meta = PROVIDER_META[String(provider || '').toUpperCase()] || PROVIDER_META.MTN;
  const sizeClass = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5`}
        style={{ backgroundColor: meta.bg }}
      >
        <img src={meta.src} alt={meta.label} className="h-full w-full object-cover" />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-[#111111]">{meta.label}</span>
      )}
    </div>
  );
}

export { PROVIDER_META };

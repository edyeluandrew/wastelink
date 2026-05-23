import { InboxIcon } from 'lucide-react';

export default function EmptyState({ 
  title = '',
  message = 'No data available',
  icon: Icon = InboxIcon,
  subtext = '',
  actionLabel = '',
  onAction,
  actionHref = '',
  actionIcon: ActionIcon,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#D9D9D9] bg-white px-6 py-12 text-center">
      <Icon size={42} className="mb-4 text-[#D9D9D9]" />
      {title && <p className="mb-2 text-lg font-semibold text-[#111111]">{title}</p>}
      <p className="mb-1 text-sm font-medium text-[#111111]">{message}</p>
      {subtext && <p className="text-wastelink-muted text-xs">{subtext}</p>}
      {(actionLabel && (onAction || actionHref)) && (
        actionHref ? (
          <a
            href={actionHref}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F9E44]"
          >
            {ActionIcon && <ActionIcon size={16} />}
            {actionLabel}
          </a>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2F9E44]"
          >
            {ActionIcon && <ActionIcon size={16} />}
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

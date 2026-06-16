import { X } from 'lucide-react';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md'
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-wastelink-border bg-wastelink-surface shadow-lg sm:rounded-2xl ${sizeClasses[size]}`}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-wastelink-border p-4 sm:p-6">
          <h2 className="pr-4 text-lg font-semibold text-wastelink-dark">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1 text-wastelink-muted transition-colors hover:bg-gray-100 hover:text-wastelink-dark"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

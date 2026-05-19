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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-wastelink-surface border border-wastelink-border rounded-2xl shadow-lg ${sizeClasses[size]} w-full mx-4`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-wastelink-border">
          <h2 className="text-lg font-semibold text-wastelink-dark">{title}</h2>
          <button
            onClick={onClose}
            className="text-wastelink-muted hover:text-wastelink-dark transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'base', 
  className = '',
  disabled = false,
  ...props 
}) {
  const baseClasses = 'font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  
  let variantClasses = 'btn-primary';
  if (variant === 'secondary') {
    variantClasses = 'btn-secondary';
  } else if (variant === 'danger') {
    variantClasses = 'px-4 py-2 bg-red-600 text-white hover:bg-red-700';
  }

  let sizeClasses = 'px-4 py-2';
  if (size === 'sm') {
    sizeClasses = 'px-3 py-1 text-sm';
  } else if (size === 'lg') {
    sizeClasses = 'px-6 py-3 text-lg';
  }

  return (
    <button 
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

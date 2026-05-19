import { AlertCircle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ error, onRetry }) {
  const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred while loading data.';
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle size={40} className="text-red-500 mb-4" />
      <p className="text-wastelink-dark text-sm font-medium mb-2">Error</p>
      <p className="text-wastelink-muted text-sm mb-4 text-center max-w-md">{errorMessage}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm">
          Try Again
        </Button>
      )}
    </div>
  );
}

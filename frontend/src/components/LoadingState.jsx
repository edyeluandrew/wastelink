import { Loader } from 'lucide-react';

export default function LoadingState({ message = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader size={40} className="text-wastelink-primary animate-spin mb-4" />
      <p className="text-wastelink-muted text-sm">{message}</p>
    </div>
  );
}

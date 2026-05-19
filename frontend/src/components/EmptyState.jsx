import { InboxIcon } from 'lucide-react';

export default function EmptyState({ 
  message = 'No data available',
  icon: Icon = InboxIcon,
  subtext = '' 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon size={40} className="text-wastelink-border mb-4" />
      <p className="text-wastelink-dark text-sm font-medium mb-1">{message}</p>
      {subtext && <p className="text-wastelink-muted text-xs">{subtext}</p>}
    </div>
  );
}

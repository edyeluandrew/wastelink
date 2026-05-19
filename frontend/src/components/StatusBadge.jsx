import { formatStatus } from '../utils/formatters';

export default function StatusBadge({ status }) {
  if (!status) return <span>-</span>;

  const statusLower = status.toLowerCase();
  
  let badgeClass = 'badge-gray';
  
  if (['active', 'verified', 'paid'].includes(statusLower)) {
    badgeClass = statusLower === 'paid' ? 'badge-blue' : 'badge-green';
  } else if (statusLower === 'pending') {
    badgeClass = 'badge-amber';
  } else if (statusLower === 'rejected' || statusLower === 'inactive') {
    badgeClass = statusLower === 'rejected' ? 'badge-red' : 'badge-gray';
  }

  return <span className={badgeClass}>{formatStatus(status)}</span>;
}

import { formatStatus } from '../utils/formatters';

export default function StatusBadge({ status }) {
  if (!status) return <span>-</span>;

  const statusLower = status.toLowerCase();
  
  let badgeClass = 'badge-gray';
  
  if (['active', 'verified', 'paid', 'approved', 'success'].includes(statusLower)) {
    badgeClass = statusLower === 'paid' ? 'badge-blue' : 'badge-green';
  } else if (statusLower === 'pending') {
    badgeClass = 'badge-amber';
  } else if (statusLower === 'payout_initiated') {
    badgeClass = 'badge-blue';
  } else if (statusLower === 'rejected' || statusLower === 'failed') {
    badgeClass = 'badge-red';
  } else if (statusLower === 'inactive') {
    badgeClass = 'badge-gray';
  }

  return <span className={badgeClass}>{formatStatus(status)}</span>;
}

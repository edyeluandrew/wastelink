import { useLocation } from 'react-router-dom';

export default function Topbar() {
  const location = useLocation();

  const pageTitle = location.pathname === '/'
    ? 'Overview'
    : location.pathname.slice(1).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className="bg-wastelink-surface border-b border-wastelink-border px-8 py-4 sticky top-0 z-40">
      <h2 className="text-2xl font-bold text-wastelink-dark">{pageTitle}</h2>
      <p className="text-sm text-wastelink-muted mt-1">Kampala Pilot Dashboard</p>
    </div>
  );
}

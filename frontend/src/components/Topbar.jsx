import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { logout, getAuthUser, isAuthenticated } from '../utils/auth';

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();

  const pageTitle = location.pathname === '/'
    ? 'Overview'
    : location.pathname.slice(1).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className="bg-wastelink-surface border-b border-wastelink-border px-8 py-4 sticky top-0 z-40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-wastelink-dark">{pageTitle}</h2>
          <p className="text-sm text-wastelink-muted mt-1">Kampala Pilot Dashboard</p>
        </div>

        {isAuthenticated() && (
          <div className="flex items-center gap-3">
            {user?.role && (
              <div className="hidden items-center gap-2 rounded-full border border-wastelink-border bg-white px-3 py-2 text-xs font-semibold text-wastelink-dark md:flex">
                <ShieldCheck size={14} className="text-[#238636]" />
                {user.role}
              </div>
            )}
            <button
              onClick={() => logout(navigate, { redirectTo: '/login' })}
              className="inline-flex items-center gap-2 rounded-full border border-wastelink-border bg-white px-4 py-2 text-sm font-semibold text-wastelink-dark transition hover:border-[#238636] hover:text-[#238636]"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

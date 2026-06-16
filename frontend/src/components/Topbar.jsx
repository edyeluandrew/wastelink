import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { logout, getAuthUser, isAuthenticated } from '../utils/auth';
import { AdminMenuButton } from './AdminBottomNav';
import { getAdminNavItems, isAdminNavActive } from '../admin/config/navigation';

export default function Topbar({ onOpenMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();

  const activeItem = getAdminNavItems(user?.role).find((item) =>
    isAdminNavActive(location.pathname, item)
  );

  const pageTitle = activeItem?.label
    || (location.pathname === '/' ? 'Overview' : location.pathname.slice(1).split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));

  return (
    <div className="sticky top-0 z-30 border-b border-[#D9D9D9] bg-white/95 backdrop-blur">
      <div className="flex items-start justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AdminMenuButton onOpen={onOpenMenu} />
          <div className="min-w-0">
            <h2 className="font-brand text-lg font-bold leading-tight text-[#111111] md:text-2xl">{pageTitle}</h2>
            <p className="mt-0.5 text-xs text-[#6B7280] md:text-sm">Kampala Pilot Dashboard</p>
          </div>
        </div>

        {isAuthenticated() && (
          <div className="flex shrink-0 items-center gap-2">
            {user?.role && (
              <div className="hidden items-center gap-2 rounded-full border border-[#D9D9D9] bg-white px-3 py-2 text-xs font-semibold text-[#111111] sm:flex">
                <ShieldCheck size={14} className="text-[#238636]" />
                {user.role.replace('_', ' ')}
              </div>
            )}
            <button
              type="button"
              onClick={() => logout(navigate, { redirectTo: '/login' })}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#D9D9D9] bg-white px-3 py-2 text-xs font-semibold text-[#111111] transition hover:border-[#238636] hover:text-[#238636] md:gap-2 md:px-4 md:text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

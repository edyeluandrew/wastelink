import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCityLabel, resolveAppCity } from '../utils/city';
import { getAuthUser, logout } from '../utils/auth';
import { getAdminNavItems, isAdminNavActive } from '../admin/config/navigation';

function SidebarNav({ onNavigate, showClose = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const menuItems = getAdminNavItems(authUser?.role);
  const cityLabel = formatCityLabel(resolveAppCity(authUser));

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#D9D9D9] p-5">
        <div className="flex items-center gap-3">
          <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="font-brand text-base font-bold text-[#238636]">WasteLink Uganda</h1>
            <p className="text-xs text-[#6B7280]">{cityLabel} · Admin</p>
          </div>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {authUser?.name && (
        <div className="border-b border-[#D9D9D9] px-5 py-3">
          <p className="text-sm font-semibold text-[#111111]">{authUser.name}</p>
          <p className="text-xs text-[#6B7280]">{authUser.email}</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map(({ path, label, icon: Icon, matchPaths }) => {
          const active = isAdminNavActive(location.pathname, { path, matchPaths });

          return (
            <NavLink
              key={path}
              to={path}
              onClick={onNavigate}
              className={[
                'flex items-center gap-3 rounded-2xl border-l-4 px-4 py-3 text-sm font-semibold transition-all',
                active
                  ? 'border-[#238636] bg-[#EAF6EA] text-[#238636]'
                  : 'border-transparent text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]',
              ].join(' ')}
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-[#D9D9D9] p-4">
        <button
          type="button"
          onClick={() => logout(navigate, { redirectTo: '/login' })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D9D9D9] bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition hover:border-red-400 hover:text-red-600"
        >
          <LogOut size={18} />
          Logout
        </button>
        <p className="text-center text-xs text-[#6B7280]">Connected to API</p>
      </div>
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onMobileClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-[#D9D9D9] bg-white md:sticky md:top-0 md:flex">
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={[
          'fixed top-0 left-0 z-50 flex h-full w-[min(85vw,20rem)] flex-col bg-white shadow-xl transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        ].join(' ')}
      >
        <SidebarNav showClose onClose={onMobileClose} onNavigate={onMobileClose} />
      </aside>
    </>
  );
}

import { Outlet, Link, useLocation } from 'react-router-dom';
import { getAuthUser } from '../../utils/auth';
import RecyclerBottomNav from './RecyclerBottomNav';
import { RECYCLER_NAV_ITEMS, isRecyclerNavActive } from '../config/navigation';
import { logout } from '../../utils/auth';

export default function RecyclerLayout() {
  const user = getAuthUser();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F8F9FA] md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-[#E5E7EB] bg-white md:block">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex items-center gap-2">
            <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-9 w-9" />
            <div>
              <p className="text-sm font-bold text-[#111111]">WasteLink</p>
              <p className="text-xs text-[#6B7280]">Recycler Portal</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {RECYCLER_NAV_ITEMS.map((item) => {
            const active = isRecyclerNavActive(location.pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active ? 'bg-[#EAF6EA] text-[#238636]' : 'text-[#374151] hover:bg-[#F3F4F6]'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280]">Recycler</p>
              <p className="font-semibold text-[#111111]">{user?.recycler?.company_name || user?.name || 'Dashboard'}</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg border border-[#D1D5DB] px-3 py-1.5 text-sm text-[#374151] hover:bg-[#F9FAFB]"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <RecyclerBottomNav />
    </div>
  );
}

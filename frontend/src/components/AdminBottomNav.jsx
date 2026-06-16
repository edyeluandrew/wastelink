import { NavLink, useLocation } from 'react-router-dom';
import { Menu, MoreHorizontal } from 'lucide-react';
import { getAuthUser } from '../utils/auth';
import { ADMIN_MOBILE_NAV_ITEMS, isAdminNavActive } from '../admin/config/navigation';

export default function AdminBottomNav({ onOpenMenu }) {
  const location = useLocation();
  const authUser = getAuthUser();
  const items = ADMIN_MOBILE_NAV_ITEMS(authUser?.role);

  return (
    <nav
      className="admin-bottom-nav border-t border-[#D9D9D9] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-[4.25rem] items-stretch">
        {items.map(({ path, label, shortLabel, icon: Icon, matchPaths }) => {
          const active = isAdminNavActive(location.pathname, { path, matchPaths });

          return (
            <NavLink
              key={path}
              to={path}
              className={[
                'flex flex-1 flex-col items-center justify-center gap-1 px-1',
                active ? 'text-[#238636]' : 'text-[#6B7280]',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-2xl',
                  active ? 'bg-[#EAF6EA]' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon size={20} />
              </span>
              <span className="text-[10px] font-semibold leading-none">{shortLabel || label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-[#6B7280]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-transparent">
            <MoreHorizontal size={20} />
          </span>
          <span className="text-[10px] font-semibold leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}

export function AdminMenuButton({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] p-2.5 text-[#111111] md:hidden"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}

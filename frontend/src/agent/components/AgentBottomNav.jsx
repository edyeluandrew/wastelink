import { NavLink, useLocation } from 'react-router-dom';
import { AGENT_NAV_ITEMS, isAgentNavActive } from '../config/navigation';

export default function AgentBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D9D9D9] bg-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-16 items-stretch">
        {AGENT_NAV_ITEMS.map(({ path, label, icon: Icon, matchPaths }) => {
          const active = isAgentNavActive(location.pathname, { path, matchPaths });

          return (
            <NavLink
              key={path}
              to={path}
              className={[
                'flex flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-2',
                active ? 'text-[#238636]' : 'text-[#6B7280]',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-xl transition',
                  active ? 'bg-[#EAF6EA]' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon size={20} />
              </span>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

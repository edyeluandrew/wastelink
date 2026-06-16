import { NavLink, useLocation } from 'react-router-dom';
import { AGENT_NAV_ITEMS, isAgentNavActive } from '../config/navigation';

export default function AgentBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="agent-bottom-nav border-t border-[#D9D9D9] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-[4.5rem] items-stretch">
        {AGENT_NAV_ITEMS.map(({ path, label, icon: Icon, matchPaths }) => {
          const active = isAgentNavActive(location.pathname, { path, matchPaths });

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
                  'flex h-9 w-9 items-center justify-center rounded-2xl transition',
                  active ? 'bg-[#EAF6EA]' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon size={20} />
              </span>
              <span className="text-[11px] font-semibold leading-none">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock3, CheckCircle2, ClipboardList } from 'lucide-react';

const navItems = [
  { path: '/agent/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/agent/pending', label: 'Pending', icon: Clock3 },
  { path: '/agent/verify', label: 'Verify', icon: CheckCircle2 },
  { path: '/agent/history', label: 'History', icon: ClipboardList },
];

export default function AgentBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D9D9D9] bg-white/95 backdrop-blur md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              [
                'flex h-full flex-1 flex-col items-center justify-center gap-1 transition',
                isActive
                  ? 'border-t-4 border-[#238636] text-[#238636]'
                  : 'border-t-4 border-transparent text-[#6B7280] hover:text-[#111111]',
              ].join(' ')
            }
          >
            <Icon size={20} />
            <span className="text-[11px] font-semibold">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

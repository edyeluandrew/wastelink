import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Clock3, CheckCircle2, ClipboardList, LogOut, MapPin } from 'lucide-react';
import { getAgentCollectionPoint, clearAgentCollectionPoint } from '../utils/agentSession';
import { logout, getAuthUser } from '../../utils/auth';

const navItems = [
  { path: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/agent/pending', label: 'Pending', icon: Clock3 },
  { path: '/agent/verify', label: 'Verify', icon: CheckCircle2 },
  { path: '/agent/history', label: 'History', icon: ClipboardList },
];

export default function AgentSidebar() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const collectionPoint = getAgentCollectionPoint();
  const isAssignedAgent = authUser?.role === 'AGENT' && Boolean(authUser.collection_point);

  const handleLogout = () => {
    clearAgentCollectionPoint();
    logout(navigate, { redirectTo: '/login' });
  };

  return (
    <aside className="hidden md:flex md:h-screen md:w-72 md:sticky md:top-0 md:flex-col border-r border-[#D9D9D9] bg-white">
      <div className="border-b border-[#D9D9D9] p-6">
        <div className="mb-4 flex items-center gap-2">
          <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-8 w-8 object-contain" />
          <div className="inline-flex items-center gap-2 rounded-2xl bg-[#EAF6EA] px-3 py-2 font-semibold text-[#238636]">
            <CheckCircle2 size={18} />
            <span style={{ fontFamily: 'Orbitron' }}>WasteLink Agent</span>
          </div>
        </div>

        {collectionPoint ? (
          <div className="rounded-2xl border border-[#BDE5BF] bg-[#EAF6EA] p-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#238636]">
              <MapPin size={12} />
              {isAssignedAgent ? 'Assigned Location' : 'Current Location'}
            </p>
            <p className="mt-1 font-semibold text-[#111111]">{collectionPoint.name}</p>
            <p className="text-xs text-[#6B7280]">{collectionPoint.division}</p>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">No collection point selected.</p>
        )}

        {authUser?.name && (
          <p className="mt-3 text-sm font-semibold text-[#111111]">{authUser.name}</p>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-2xl border-l-4 px-4 py-3 text-sm font-semibold transition-all',
                isActive
                  ? 'border-[#238636] bg-[#EAF6EA] text-[#238636]'
                  : 'border-transparent text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]',
              ].join(' ')
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#D9D9D9] p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D9D9D9] bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition hover:border-red-400 hover:text-red-600"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}

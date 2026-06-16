import { MapPin, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAgentCollectionPoint, clearAgentCollectionPoint } from '../utils/agentSession';
import { logout, getAuthUser } from '../../utils/auth';

export default function AgentTopbar({ showLogout = true }) {
  const navigate = useNavigate();
  const collectionPoint = getAgentCollectionPoint();
  const authUser = getAuthUser();

  const handleLogout = () => {
    clearAgentCollectionPoint();
    logout(navigate, { redirectTo: '/login' });
  };

  return (
    <div className="sticky top-0 z-40 border-b border-[#D9D9D9] bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-[#238636] md:text-lg" style={{ fontFamily: 'Orbitron' }}>
            {collectionPoint?.name || 'Agent Dashboard'}
          </h1>
          <p className="truncate text-xs text-[#6B7280]">
            {collectionPoint?.division ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {collectionPoint.division}
              </span>
            ) : (
              'Collection point verification'
            )}
            {authUser?.name ? ` · ${authUser.name}` : ''}
          </p>
        </div>

        {showLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-3 py-2 text-xs font-semibold text-[#111111] transition hover:border-red-400 hover:text-red-600"
          >
            <LogOut size={14} />
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

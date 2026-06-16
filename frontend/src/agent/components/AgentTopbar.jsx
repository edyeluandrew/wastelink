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
      <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-2 px-4 py-3 md:items-center md:gap-3 md:px-6">
        <div className="min-w-0 flex-1 pr-1">
          <h1 className="font-brand text-sm font-bold leading-snug text-[#238636] sm:text-base md:text-lg">
            {collectionPoint?.name || 'Agent Dashboard'}
          </h1>
          <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
            {collectionPoint?.division ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                <MapPin size={12} className="shrink-0" />
                <span>{collectionPoint.division}</span>
              </span>
            ) : (
              'Collection point verification'
            )}
            {authUser?.name ? <span>{` · ${authUser.name}`}</span> : null}
          </p>
        </div>

        {showLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-2.5 py-2 text-[11px] font-semibold text-[#111111] transition hover:border-red-400 hover:text-red-600 sm:gap-2 sm:px-3 sm:text-xs"
          >
            <LogOut size={14} />
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import AgentSidebar from './AgentSidebar';
import AgentTopbar from './AgentTopbar';
import AgentBottomNav from './AgentBottomNav';

export default function AgentLayout() {
  const isDesktop = useIsDesktop();

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className={isDesktop ? 'flex min-h-screen' : 'flex min-h-screen flex-col'}>
        {isDesktop && <AgentSidebar />}

        <div className="flex min-h-screen flex-1 flex-col">
          <AgentTopbar showLogout={!isDesktop} />

          <main className={`flex-1 ${isDesktop ? 'pb-8' : 'pb-20'}`}>
            <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {!isDesktop && <AgentBottomNav />}
    </div>
  );
}

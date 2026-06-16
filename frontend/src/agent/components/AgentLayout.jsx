import { Outlet } from 'react-router-dom';
import AgentSidebar from './AgentSidebar';
import AgentTopbar from './AgentTopbar';
import AgentBottomNav from './AgentBottomNav';

export default function AgentLayout() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] md:flex">
      <AgentSidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <AgentTopbar />

        <main className="flex-1 pb-24 md:pb-8">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <AgentBottomNav />
    </div>
  );
}

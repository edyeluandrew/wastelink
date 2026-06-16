import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AdminBottomNav from '../components/AdminBottomNav';
import { useIsDesktop } from '../hooks/useMediaQuery';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDesktop = useIsDesktop();

  return (
    <div className="admin-shell min-h-screen bg-[#F8F9FA]">
      <div className="flex min-h-screen">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />

          <main className={`flex-1 overflow-y-auto ${isDesktop ? 'pb-8' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]'}`}>
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {!isDesktop && <AdminBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />}
    </div>
  );
}

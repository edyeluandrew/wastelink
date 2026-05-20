import { Outlet } from 'react-router-dom';
import { Sidebar, Topbar } from '../components';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-wastelink-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

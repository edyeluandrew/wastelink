import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Menu, LogOut, LayoutDashboard, Clock3, CheckCircle2, ClipboardList, MapPin } from 'lucide-react';
import { getAgentCollectionPoint, clearAgentCollectionPoint } from '../utils/agentSession';
import { logout, getAuthUser } from '../../utils/auth';

export default function AgentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const authUser = getAuthUser();
  const collectionPoint = getAgentCollectionPoint();
  const isAssignedAgent = authUser?.role === 'AGENT' && Boolean(authUser.collection_point);

  const handleChangePoint = () => {
    if (isAssignedAgent) {
      navigate('/agent/dashboard');
      return;
    }

    clearAgentCollectionPoint();
    navigate('/agent/select-point');
  };

  const handleLogout = () => {
    clearAgentCollectionPoint();
    logout(navigate, { redirectTo: '/login' });
  };

  const isActive = (path) => location.pathname === path;

  const navigationItems = [
    { label: 'Dashboard', path: '/agent/dashboard', icon: LayoutDashboard },
    { label: 'Pending', path: '/agent/pending', icon: Clock3 },
    { label: 'Verify', path: '/agent/verify', icon: CheckCircle2 },
    { label: 'History', path: '/agent/history', icon: ClipboardList },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Hidden on mobile by default */}
      <div
        className={`fixed md:relative w-64 h-screen bg-white border-r border-gray-300 shadow-md transform transition-transform duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-gray-300 flex flex-col items-center gap-2">
          <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-12 w-12 object-contain" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-green-600" style={{ fontFamily: 'Orbitron' }}>
              WasteLink Agent
            </h1>
            <p className="text-xs text-gray-500 mt-1">Collection Point Verification</p>
          </div>
        </div>

        {collectionPoint && (
          <div className="p-4 bg-green-50 border-b border-gray-300">
            <p className="text-xs text-gray-600 inline-flex items-center gap-1.5">
              <MapPin size={12} /> {isAssignedAgent ? 'Assigned Location' : 'Current Location'}
            </p>
            <p className="font-semibold text-gray-900">{collectionPoint.name}</p>
            <p className="text-xs text-gray-600">{collectionPoint.division}</p>
            {!isAssignedAgent && (
              <button
                onClick={handleChangePoint}
                className="mt-2 w-full text-xs bg-white text-green-600 border border-green-300 py-1 rounded hover:bg-green-50"
              >
                Change Point
              </button>
            )}
          </div>
        )}

        <nav className="flex-1 p-4">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`w-full text-left py-3 px-4 rounded mb-2 transition ${
                isActive(item.path)
                  ? 'bg-green-600 text-white font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
                <span className="mr-3 inline-flex">
                  <item.icon size={18} />
                </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-300">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-red-600 hover:bg-red-50 rounded transition"
          >
            <LogOut size={18} />
            Exit Agent Mode
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-300 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {collectionPoint ? collectionPoint.name : 'Agent Interface'}
              </h2>
              <p className="text-xs text-gray-600">
                {collectionPoint ? `Division: ${collectionPoint.division}` : 'No location selected'}
              </p>
            </div>
          </div>
          <div className="hidden md:block text-sm text-gray-600">
            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

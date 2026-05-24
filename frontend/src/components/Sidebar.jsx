import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  MapPin,
  Trash2,
  Map,
  DollarSign,
  FileText,
} from 'lucide-react';
import { getAuthUser, normalizeRole } from '../utils/auth';

const baseMenuItems = [
  { path: '/', label: 'Overview', icon: BarChart3 },
  { path: '/pickers', label: 'Pickers', icon: Users },
  { path: '/collection-points', label: 'Collection Points', icon: MapPin },
  { path: '/waste-logs', label: 'Waste Logs', icon: Trash2 },
  { path: '/divisions', label: 'Divisions', icon: Map },
  { path: '/earnings', label: 'Earnings', icon: DollarSign },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export default function Sidebar() {
  const location = useLocation();
  const authUser = getAuthUser();
  const role = normalizeRole(authUser?.role);
  const showUsersLink = role === 'SUPER_ADMIN' || role === 'CITY_ADMIN';
  const usersLabel = role === 'CITY_ADMIN' ? 'Agents & Pickers' : 'Users';
  const menuItems = showUsersLink
    ? [...baseMenuItems.slice(0, 2), { path: '/users', label: usersLabel, icon: Users }, ...baseMenuItems.slice(2)]
    : baseMenuItems;

  return (
    <div className="w-64 bg-wastelink-surface border-r border-wastelink-border h-screen flex flex-col sticky top-0">
      {/* Brand */}
      <div className="p-6 border-b border-wastelink-border">
        <h1 className="font-orbitron text-xl font-bold text-wastelink-primary">
          WasteLink Uganda
        </h1>
        <p className="text-xs text-wastelink-muted mt-1">Kampala Pilot</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 transition-colors border-l-4 ${
                isActive
                  ? 'border-wastelink-primary bg-wastelink-success text-wastelink-primary'
                  : 'border-transparent text-wastelink-muted hover:text-wastelink-dark hover:bg-gray-50'
              }`}
            >
              <Icon size={18} className="mr-3" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-wastelink-border">
        <p className="text-xs text-wastelink-muted text-center">
          Connected to API
        </p>
      </div>
    </div>
  );
}

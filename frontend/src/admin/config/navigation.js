import {
  BarChart3,
  Users,
  MapPin,
  Trash2,
  Map,
  DollarSign,
  FileText,
  Layers,
  Recycle,
  Package,
  ClipboardCheck,
  Building2,
} from 'lucide-react';
import { normalizeRole } from '../../utils/auth';

export const getAdminNavItems = (role) => {
  const normalizedRole = normalizeRole(role);
  const showUsersLink = normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'CITY_ADMIN';
  const usersLabel = normalizedRole === 'CITY_ADMIN' ? 'Agents & Pickers' : 'Users';

  const baseMenuItems = [
    { path: '/overview', matchPaths: ['/', '/overview'], label: 'Overview', icon: BarChart3 },
    ...(normalizedRole === 'SUPER_ADMIN'
      ? [{ path: '/cities', matchPaths: ['/cities'], label: 'Cities', icon: Building2 }]
      : []),
    { path: '/pickers', matchPaths: ['/pickers'], label: 'Pickers', icon: Users },
    ...(showUsersLink
      ? [{ path: '/users', matchPaths: ['/users'], label: usersLabel, icon: Users }]
      : []),
    { path: '/collection-points', matchPaths: ['/collection-points'], label: 'Collection Points', icon: MapPin, shortLabel: 'Points' },
    { path: '/waste-types', matchPaths: ['/waste-types'], label: 'Waste Types', icon: Layers, shortLabel: 'Types' },
    { path: '/waste-logs', matchPaths: ['/waste-logs'], label: 'Waste Logs', icon: Trash2, shortLabel: 'Logs' },
    { path: '/divisions', matchPaths: ['/divisions'], label: 'Divisions', icon: Map },
    { path: '/earnings', matchPaths: ['/earnings'], label: 'Earnings', icon: DollarSign },
    { path: '/reports', matchPaths: ['/reports'], label: 'Reports', icon: FileText },
    { path: '/recyclers', matchPaths: ['/recyclers'], label: 'Recyclers', icon: Recycle },
    { path: '/waste-sale-batches', matchPaths: ['/waste-sale-batches'], label: 'Sale Batches', icon: Package, shortLabel: 'Batches' },
    { path: '/recycler-requests', matchPaths: ['/recycler-requests'], label: 'Recycler Requests', icon: ClipboardCheck, shortLabel: 'Recycler' },
  ];

  return baseMenuItems;
};

export const isAdminNavActive = (pathname, item) =>
  item.matchPaths?.includes(pathname) ?? pathname === item.path;

export const ADMIN_MOBILE_NAV_ITEMS = (role) => {
  const items = getAdminNavItems(role);
  const pick = (path, shortLabel) => {
    const item = items.find((entry) => entry.path === path);
    return item ? { ...item, shortLabel } : null;
  };

  return [pick('/overview', 'Home'), pick('/pickers', 'Pickers'), pick('/waste-logs', 'Logs'), pick('/earnings', 'Pay')].filter(Boolean);
};

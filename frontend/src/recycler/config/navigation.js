import { LayoutDashboard, Package, ClipboardList, History, User } from 'lucide-react';

export const RECYCLER_NAV_ITEMS = [
  { path: '/recycler/dashboard', matchPaths: ['/recycler', '/recycler/dashboard'], label: 'Overview', icon: LayoutDashboard, shortLabel: 'Home' },
  { path: '/recycler/inventory', matchPaths: ['/recycler/inventory'], label: 'Available Waste', icon: Package, shortLabel: 'Waste' },
  { path: '/recycler/requests', matchPaths: ['/recycler/requests'], label: 'Requests', icon: ClipboardList, shortLabel: 'Requests' },
  { path: '/recycler/history', matchPaths: ['/recycler/history'], label: 'History', icon: History, shortLabel: 'History' },
  { path: '/recycler/profile', matchPaths: ['/recycler/profile'], label: 'Profile', icon: User, shortLabel: 'Profile' },
];

export const isRecyclerNavActive = (pathname, item) =>
  item.matchPaths?.includes(pathname) ?? pathname === item.path;

export const RECYCLER_MOBILE_NAV_ITEMS = RECYCLER_NAV_ITEMS.filter((item) =>
  ['/recycler/dashboard', '/recycler/inventory', '/recycler/requests', '/recycler/history'].includes(item.path)
);

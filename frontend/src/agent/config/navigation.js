import { LayoutDashboard, Clock3, CheckCircle2, ClipboardList } from 'lucide-react';

export const AGENT_NAV_ITEMS = [
  {
    path: '/agent/dashboard',
    matchPaths: ['/agent', '/agent/dashboard'],
    label: 'Home',
    desktopLabel: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/agent/pending',
    matchPaths: ['/agent/pending'],
    label: 'Pending',
    desktopLabel: 'Pending',
    icon: Clock3,
  },
  {
    path: '/agent/verify',
    matchPaths: ['/agent/verify'],
    label: 'Verify',
    desktopLabel: 'Verify',
    icon: CheckCircle2,
  },
  {
    path: '/agent/history',
    matchPaths: ['/agent/history'],
    label: 'History',
    desktopLabel: 'History',
    icon: ClipboardList,
  },
];

export const isAgentNavActive = (pathname, item) =>
  item.matchPaths?.includes(pathname) ?? pathname === item.path;

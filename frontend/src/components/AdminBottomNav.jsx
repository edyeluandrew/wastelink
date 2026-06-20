import { useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { getAuthUser } from '../utils/auth';
import { ADMIN_MOBILE_NAV_ITEMS, isAdminNavActive } from '../admin/config/navigation';
import KnifeBottomNav from './KnifeBottomNav';

export default function AdminBottomNav({ onOpenMenu }) {
  const location = useLocation();
  const authUser = getAuthUser();
  const items = ADMIN_MOBILE_NAV_ITEMS(authUser?.role);

  return (
    <KnifeBottomNav
      items={items}
      isActive={(item) => isAdminNavActive(location.pathname, item)}
      extraActions={[
        {
          key: 'more',
          label: 'More',
          shortLabel: 'More',
          icon: MoreHorizontal,
          onClick: onOpenMenu,
        },
      ]}
    />
  );
}

export { AdminMenuButton } from './AdminBottomNavMenuButton';

import { useLocation } from 'react-router-dom';
import KnifeBottomNav from '../../components/KnifeBottomNav';
import { RECYCLER_MOBILE_NAV_ITEMS, isRecyclerNavActive } from '../config/navigation';

export default function RecyclerBottomNav() {
  const location = useLocation();

  return (
    <KnifeBottomNav
      home={{ path: '/recycler/dashboard', matchPaths: ['/recycler', '/recycler/dashboard'], label: 'Overview' }}
      items={RECYCLER_MOBILE_NAV_ITEMS}
      isActive={(item) => isRecyclerNavActive(location.pathname, item)}
    />
  );
}

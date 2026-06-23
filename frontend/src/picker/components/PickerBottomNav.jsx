import { useLocation } from 'react-router-dom';
import { FileText, Briefcase, Wallet, MapPin } from 'lucide-react';
import KnifeBottomNav from '../../components/KnifeBottomNav';

const NAV_ITEMS = [
  { path: '/picker/log-waste', label: 'Log', icon: FileText },
  { path: '/picker/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/picker/earnings', label: 'Pay', icon: Wallet },
  { path: '/picker/collection-points', label: 'Points', icon: MapPin },
];

export default function PickerBottomNav() {
  const location = useLocation();

  return (
    <KnifeBottomNav
      home={{ path: '/picker/dashboard', label: 'Home' }}
      items={NAV_ITEMS}
      isActive={(item) => location.pathname === item.path}
    />
  );
}

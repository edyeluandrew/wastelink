import { Link, useLocation } from 'react-router-dom';

export default function PickerBottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/picker/dashboard', label: 'Home', icon: '🏠' },
    { path: '/picker/log-waste', label: 'Log', icon: '📝' },
    { path: '/picker/jobs', label: 'Jobs', icon: '💼' },
    { path: '/picker/earnings', label: 'Earnings', icon: '💰' },
    { path: '/picker/collection-points', label: 'Points', icon: '📍' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition ${
              isActive(item.path)
                ? 'text-green-700 border-t-4 border-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

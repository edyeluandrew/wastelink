#!/usr/bin/env python3
import os

os.chdir('/home/localhost8081/wastelink/frontend/src/picker')

# 1. PickerBottomNav
with open('components/PickerBottomNav.jsx', 'w') as f:
    f.write("""import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Briefcase, Wallet, MapPin } from 'lucide-react';

export default function PickerBottomNav() {
  const location = useLocation();
  const icons = { Home, FileText, Briefcase, Wallet, MapPin };

  const navItems = [
    { path: '/picker/dashboard', label: 'Home', icon: 'Home' },
    { path: '/picker/log-waste', label: 'Log', icon: 'FileText' },
    { path: '/picker/jobs', label: 'Jobs', icon: 'Briefcase' },
    { path: '/picker/earnings', label: 'Earnings', icon: 'Wallet' },
    { path: '/picker/collection-points', label: 'Points', icon: 'MapPin' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const IconComponent = icons[item.icon];
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition ${
                isActive(item.path)
                  ? 'text-green-700 border-t-4 border-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
""")
print('✓ Updated PickerBottomNav.jsx')

# 2. PickerTopbar
with open('components/PickerTopbar.jsx', 'w') as f:
    f.write("""import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon } from 'lucide-react';
import { clearPickerSession } from '../utils/pickerSession';

export default function PickerTopbar({ picker }) {
  const navigate = useNavigate();

  const handleSwitchPicker = () => {
    clearPickerSession();
    navigate('/picker/start');
  };

  return (
    <div className="bg-white border-b border-gray-300 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-green-700" />
          <h1 className="text-xl font-bold text-green-700" style={{ fontFamily: 'Orbitron' }}>
            WasteLink
          </h1>
          <span className="text-sm text-gray-600">Picker</span>
        </div>

        <div className="flex items-center gap-3">
          {picker && (
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{picker.name}</p>
              <p className="text-xs text-gray-600">{picker.phone}</p>
            </div>
          )}
          
          <button
            onClick={handleSwitchPicker}
            className="text-xs px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Switch
          </button>
        </div>
      </div>
    </div>
  );
}
""")
print('✓ Updated PickerTopbar.jsx')

print('\n✓ Lucide-react icons integrated!')

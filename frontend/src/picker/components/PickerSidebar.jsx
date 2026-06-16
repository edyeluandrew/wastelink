import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Recycle,
  ClipboardList,
  Wallet,
  MapPin,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout, isAuthenticatedPicker } from '../../utils/auth';
import { clearPickerSession } from '../utils/pickerSession';
import { formatGenderLabel, formatStatus } from '../../utils/formatters';

const navItems = [
  { path: '/picker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/picker/log-waste', label: 'Log Waste', icon: Recycle },
  { path: '/picker/jobs', label: 'My Jobs', icon: ClipboardList },
  { path: '/picker/earnings', label: 'Earnings', icon: Wallet },
  { path: '/picker/collection-points', label: 'Collection Points', icon: MapPin },
  { path: '/picker/help', label: 'Help', icon: HelpCircle },
];

export default function PickerSidebar({ picker }) {
  const authenticatedPicker = isAuthenticatedPicker();
  const navigate = useNavigate();

  const handleSwitchPicker = () => {
    if (authenticatedPicker) {
      logout(navigate, { redirectTo: '/login' });
      return;
    }

    clearPickerSession();
    navigate('/picker/start', { replace: true });
  };

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col md:sticky md:top-0 md:h-screen bg-[#FFFFFF] border-r border-[#D9D9D9]">
      <div className="p-6 border-b border-[#D9D9D9]">
        <div className="flex items-center gap-2 mb-4">
          <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-8 w-8 object-contain" />
          <div className="inline-flex items-center gap-2 rounded-2xl bg-[#EAF6EA] px-3 py-2 text-[#238636] font-semibold">
            <Recycle size={18} />
            <span style={{ fontFamily: 'Orbitron' }}>WasteLink Picker</span>
          </div>
        </div>

        {picker ? (
          <div className="space-y-2 text-sm">
            <p className="text-lg font-semibold text-[#111111]">{picker.name}</p>
            <p className="text-[#6B7280] font-medium">Code: {picker.picker_code}</p>
            <p className="text-[#6B7280]">Phone: {picker.phone}</p>
            <p className="text-[#6B7280]">{picker.division}</p>
            {picker.main_waste_type && <p className="text-[#6B7280]">Mostly collects: {formatStatus(picker.main_waste_type)}</p>}
            {picker.gender && <p className="text-[#6B7280]">{formatGenderLabel(picker.gender)}</p>}
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">Your picker session will appear here.</p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => [
              'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all border-l-4',
              isActive
                ? 'border-[#238636] bg-[#EAF6EA] text-[#238636]'
                : 'border-transparent text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111111]',
            ].join(' ')}
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#D9D9D9]">
        <button
          type="button"
          onClick={handleSwitchPicker}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D9D9D9] bg-white px-4 py-3 text-sm font-semibold text-[#111111] transition hover:border-[#238636] hover:text-[#238636]"
        >
          <LogOut size={18} />
          {authenticatedPicker ? 'Logout' : 'Switch Picker'}
        </button>
      </div>
    </aside>
  );
}
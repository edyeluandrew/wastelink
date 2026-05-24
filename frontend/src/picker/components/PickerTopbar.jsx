import { Recycle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearAllSessions, isAuthenticatedPicker } from '../../utils/auth';
import { clearPickerSession } from '../utils/pickerSession';

export default function PickerTopbar({ picker }) {
  const authenticatedPicker = isAuthenticatedPicker();
  const navigate = useNavigate();

  const handleSwitchPicker = () => {
    if (authenticatedPicker) {
      clearAllSessions();
      navigate('/login', { replace: true });
      return;
    }

    clearPickerSession();
    navigate('/picker/start', { replace: true });
  };

  return (
    <div className="sticky top-0 z-40 border-b border-[#D9D9D9] bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF6EA] text-[#238636]">
            <Recycle size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#238636] md:text-lg" style={{ fontFamily: 'Orbitron' }}>
              WasteLink Picker
            </h1>
            <p className="text-xs text-[#6B7280]">Green collection dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {picker?.id && (
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-[#111111]">{picker.name}</p>
              <p className="text-xs text-[#6B7280]">{picker.picker_code} · {picker.phone}</p>
              <p className="text-xs text-[#6B7280]">{picker.division}</p>
            </div>
          )}

          <button
            onClick={handleSwitchPicker}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-3 py-2 text-xs font-semibold text-[#111111] transition hover:border-[#238636] hover:text-[#238636] md:px-4"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">{authenticatedPicker ? 'Logout' : 'Switch Picker'}</span>
            <span className="sm:hidden">{authenticatedPicker ? 'Logout' : 'Switch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

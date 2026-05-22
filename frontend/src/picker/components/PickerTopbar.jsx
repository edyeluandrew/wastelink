import { useNavigate } from 'react-router-dom';
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

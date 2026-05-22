import { Outlet, useNavigate } from 'react-router-dom';
import PickerTopbar from './PickerTopbar';
import PickerBottomNav from './PickerBottomNav';
import { getPickerSession } from '../utils/pickerSession';

export default function PickerLayout() {
  const navigate = useNavigate();
  const picker = getPickerSession();

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-0">
      <PickerTopbar picker={picker} />
      
      <main className="max-w-2xl mx-auto p-4 pb-24 md:pb-6">
        <Outlet />
      </main>

      <PickerBottomNav />
    </div>
  );
}

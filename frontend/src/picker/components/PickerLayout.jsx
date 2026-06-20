import { Outlet } from 'react-router-dom';
import PickerTopbar from './PickerTopbar';
import PickerBottomNav from './PickerBottomNav';
import PickerSidebar from './PickerSidebar';
import { getCurrentPicker } from '../utils/pickerSession';

export default function PickerLayout() {
  const picker = getCurrentPicker();
  const hasSession = Boolean(picker?.id);

  return (
    <div className="min-h-screen bg-[#F8F9FA] md:flex">
      {hasSession && <PickerSidebar picker={picker} />}

      <div className="flex min-h-screen flex-1 flex-col">
        <PickerTopbar picker={picker} />

        <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {hasSession && <PickerBottomNav />}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, Button } from '../../components';
import apiClient from '../../api/axios';
import { setPickerSession } from '../utils/pickerSession';
import { Recycle, ArrowRight } from 'lucide-react';

export default function PickerStart() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleContinue = async (e) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all pickers
      const response = await apiClient.get('/pickers');
      
      if (response.data?.success) {
        const allPickers = response.data.data || [];
        
        // Find picker with matching phone
        const foundPicker = allPickers.find(p => p.phone === phone);
        
        if (foundPicker) {
          // Picker found - save session and navigate to dashboard
          setPickerSession(foundPicker);
          navigate('/picker/dashboard');
        } else {
          // No picker found
          setError(`No picker found with phone: ${phone}`);
        }
      } else {
        setError('Failed to fetch pickers');
      }
    } catch (err) {
      console.error('[PickerStart] Error:', err);
      setError(err.response?.data?.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Searching for your account..." />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-2xl items-center justify-center py-10">
      <div className="w-full rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_70%)] p-6 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#238636] shadow-sm">
            <Recycle size={30} />
          </div>
          <h1 className="text-3xl font-bold text-[#238636]" style={{ fontFamily: 'Orbitron' }}>
            WasteLink
          </h1>
          <p className="mt-2 text-lg text-[#111111]">Picker Portal</p>
          <p className="text-sm text-[#6B7280]">Earn money collecting waste.</p>
        </div>

        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="256 700 000 000"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-[#6B7280]">
                Enter the phone number you registered with.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              onClick={handleContinue}
              disabled={loading || !phone.trim()}
              className="flex w-full items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2F9E44]"
            >
              Continue <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm text-[#6B7280] mb-2">Don't have an account yet?</p>
          <button
            onClick={() => navigate('/picker/register')}
            className="text-[#238636] font-semibold hover:underline"
          >
            Register as a new picker →
          </button>
        </div>
      </div>
    </div>
  );
}

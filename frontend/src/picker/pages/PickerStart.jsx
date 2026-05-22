import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, Button } from '../../components';
import apiClient from '../../api/axios';
import { setPickerSession } from '../utils/pickerSession';

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
    <div className="max-w-sm mx-auto pt-12 pb-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-green-700 mb-2" style={{ fontFamily: 'Orbitron' }}>
          🔗 WasteLink
        </h1>
        <p className="text-xl text-gray-600 mb-1">Picker Portal</p>
        <p className="text-sm text-gray-500">Earn money collecting waste</p>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-300 mb-6">
        <form onSubmit={handleContinue} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="256 700 000 000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the phone number you registered with
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={loading || !phone.trim()}
            className="w-full"
          >
            Continue
          </Button>
        </form>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Don't have an account yet?</p>
        <button
          onClick={() => navigate('/picker/register')}
          className="text-green-700 font-semibold hover:underline"
        >
          Register as a new picker →
        </button>
      </div>
    </div>
  );
}

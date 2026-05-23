import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, Button } from '../../components';
import apiClient from '../../api/axios';
import { setPickerSession } from '../utils/pickerSession';

const GENDER_OPTIONS = ['FEMALE', 'MALE', 'PREFER_NOT_TO_SAY'];
const AGE_GROUP_OPTIONS = ['Below 18', '18-24', '25-35', 'Above 35'];
const DIVISIONS = ['Kawempe', 'Makindye', 'Nakawa', 'Rubaga', 'Central'];
const WASTE_TYPES = ['PLASTIC', 'MIXED_RECYCLABLES', 'ORGANIC', 'E_WASTE', 'METAL_CARDBOARD'];

export default function PickerRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: '',
    age_group: '',
    division: '',
    main_waste_type: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ['name', 'phone', 'gender', 'age_group', 'division', 'main_waste_type'];
    for (let field of required) {
      if (!form[field]?.trim()) {
        setError(`${field.replace(/_/g, ' ')} is required`);
        return false;
      }
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/pickers', form);

      if (response.data?.success && response.data.data) {
        // Registration successful - save session and navigate
        setPickerSession(response.data.data);
        navigate('/picker/dashboard');
      } else {
        setError(response.data?.message || 'Registration failed');
      }
    } catch (err) {
      console.error('[PickerRegister] Error:', err);
      const message = err.response?.data?.message || err.message;
      if (message.includes('duplicate') || message.includes('already exists')) {
        setError('Phone number already registered. Try /picker/start to login.');
      } else {
        setError(message || 'Failed to register');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Creating your picker account..." />;
  }

  return (
    <div className="max-w-sm mx-auto pt-8 pb-12">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/picker/start')}
          className="text-sm font-semibold text-green-700 hover:text-green-800"
        >
          ← Back to Start
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Register as Picker</h1>
        <p className="text-sm text-gray-600">Fill in your information</p>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-300">
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="256 700 000 000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={loading}
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Gender *
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={loading}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Age Group */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Age Group *
            </label>
            <select
              name="age_group"
              value={form.age_group}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={loading}
            >
              <option value="">Select age group</option>
              {AGE_GROUP_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Division */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Division *
            </label>
            <select
              name="division"
              value={form.division}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={loading}
            >
              <option value="">Select division</option>
              {DIVISIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Waste Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Main Waste Type *
            </label>
            <select
              name="main_waste_type"
              value={form.main_waste_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
              disabled={loading}
            >
              <option value="">Select waste type</option>
              {WASTE_TYPES.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button onClick={handleRegister} disabled={loading} className="w-full">
            Register
          </Button>

          <p className="text-xs text-gray-600 text-center">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/picker/start')}
              className="text-green-700 font-semibold hover:underline"
            >
              Log in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

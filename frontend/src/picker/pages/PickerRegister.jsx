import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Recycle } from 'lucide-react';
import apiClient from '../../api/axios';
import { Button, LoadingState } from '../../components';
import { setAuthSession } from '../../utils/auth';
import { clearPickerSession } from '../utils/pickerSession';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const AGE_GROUP_OPTIONS = ['Below 18', '18-24', '25-35', 'Above 35'];
const DIVISIONS = ['Kawempe', 'Makindye', 'Nakawa', 'Rubaga', 'Central'];
const WASTE_TYPES = [
  { value: 'PLASTIC', label: 'Plastic' },
  { value: 'MIXED_RECYCLABLES', label: 'I collect many types / Mixed recyclables' },
  { value: 'ORGANIC', label: 'Organic' },
  { value: 'E_WASTE', label: 'E-Waste' },
  { value: 'METAL_CARDBOARD', label: 'Metal & Cardboard' },
];

const REQUIRED_FIELDS = ['name', 'phone', 'gender', 'age_group', 'division', 'main_waste_type', 'password', 'confirmPassword'];

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
    password: '',
    confirmPassword: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validateForm = () => {
    for (const field of REQUIRED_FIELDS) {
      if (!String(form[field] || '').trim()) {
        setError(`${field.replace(/_/g, ' ')} is required`);
        return false;
      }
    }

    if (form.password.length < 4) {
      setError('Password or PIN must be at least 4 characters');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password/PIN confirmation does not match');
      return false;
    }

    return true;
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/register-picker', {
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        age_group: form.age_group,
        division: form.division,
        main_waste_type: form.main_waste_type,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      const token = response.data?.data?.token;
      const user = response.data?.data?.user;

      if (response.data?.success && token && user) {
        setAuthSession(token, user);
        clearPickerSession();
        navigate('/picker/dashboard', { replace: true });
        return;
      }

      if (response.data?.success) {
        clearPickerSession();
        navigate('/login', {
          replace: true,
          state: { message: 'Registration successful. Please login.' },
        });
        return;
      }

      setError(response.data?.message || 'Registration failed');
    } catch (err) {
      console.error('[PickerRegister] Error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to register';

      if (message.includes('duplicate') || message.includes('already exists') || message.includes('registered')) {
        setError('Phone number already registered. Try /picker/start to login.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Creating your picker account..." />;
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/picker/start')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Start
        </button>
      </div>

      <div className="rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_70%)] p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#238636] shadow-sm">
            <Recycle size={30} />
          </div>
          <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>
            Register as Picker
          </h1>
          <p className="text-sm text-[#6B7280]">Fill in your information.</p>
        </div>

        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="256 700 000 000"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Gender *</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((gender) => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Age Group *</label>
              <select
                name="age_group"
                value={form.age_group}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select age group</option>
                {AGE_GROUP_OPTIONS.map((ageGroup) => (
                  <option key={ageGroup} value={ageGroup}>
                    {ageGroup}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Division *</label>
              <select
                name="division"
                value={form.division}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select division</option>
                {DIVISIONS.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Waste type you mostly collect *</label>
              <select
                name="main_waste_type"
                value={form.main_waste_type}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select waste type</option>
                {WASTE_TYPES.map((wasteType) => (
                  <option key={wasteType.value} value={wasteType.value}>
                    {wasteType.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[#6B7280]">You can still log any waste type later.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Password or PIN *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Choose a password or PIN"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Confirm Password or PIN *</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password or PIN"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2F9E44]">
              Register & Continue <ArrowRight size={16} />
            </Button>

            <p className="text-center text-xs text-[#6B7280]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/picker/start')}
                className="font-semibold text-[#238636] hover:underline"
              >
                Log in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, Button } from '../../components';
import apiClient from '../../api/axios';
import { clearPickerSession } from '../utils/pickerSession';
import { setAuthSession } from '../../utils/auth';
import { Recycle, ArrowRight } from 'lucide-react';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const AGE_GROUP_OPTIONS = ['Below 18', '18-24', '25-35', 'Above 35'];
const DIVISIONS = ['Kawempe', 'Makindye', 'Nakawa', 'Rubaga', 'Central'];
const WASTE_TYPES = [
  { value: 'PLASTIC', label: 'Plastic' },
  { value: 'MIXED_RECYCLABLES', label: 'I collect many types / Mixed recyclables' },
  { value: 'ORGANIC', label: 'Organic' },
  { value: 'E_WASTE', label: 'E-Waste' },
  { value: 'METAL_CARDBOARD', label: 'Metal & Cardboard' },
];

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
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ['name', 'phone', 'gender', 'age_group', 'division', 'main_waste_type', 'password', 'confirmPassword'];

    for (const field of required) {
      if (!String(form[field] || '').trim()) {
        setError(`${field.replace(/_/g, ' ')} is required`);
        return false;
      }
    }

    if (form.password.length < 4) {
      setError('Password or PIN must be at least 4 characters');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password/PIN confirmation does not match');
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/register-picker', {
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        age_group: form.age_group,
        division: form.division,
        main_waste_type: form.main_waste_type,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      if (response.data?.success && response.data.data?.token && response.data.data?.user) {
        setAuthSession(response.data.data.token, response.data.data.user);
        clearPickerSession();
        navigate('/picker/dashboard', { replace: true });
        return;
      }

      if (response.data?.success) {
        clearPickerSession();
        navigate('/login', {
          replace: true,
          state: { message: 'Registration successful. Please login.' },
        });
        return;
      }

      setError(response.data?.message || 'Registration failed');
    } catch (err) {
      console.error('[PickerRegister] Error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to register';

      if (message.includes('duplicate') || message.includes('already exists') || message.includes('registered')) {
        setError('Phone number already registered. Try /picker/start to login.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Creating your picker account..." />;
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/picker/start')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Start
        </button>
      </div>

      <div className="rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_70%)] p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#238636] shadow-sm">
            <Recycle size={30} />
          </div>
          <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>
            Register as Picker
          </h1>
          <p className="text-sm text-[#6B7280]">Fill in your information.</p>
        </div>

        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="256 700 000 000"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Gender *</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Age Group *</label>
              <select
                name="age_group"
                value={form.age_group}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select age group</option>
                {AGE_GROUP_OPTIONS.map((ageGroup) => (
                  <option key={ageGroup} value={ageGroup}>
                    {ageGroup}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Division *</label>
              <select
                name="division"
                value={form.division}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select division</option>
                {DIVISIONS.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Waste type you mostly collect *</label>
              <select
                name="main_waste_type"
                value={form.main_waste_type}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select waste type</option>
                {WASTE_TYPES.map((wasteType) => (
                  <option key={wasteType.value} value={wasteType.value}>
                    {wasteType.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[#6B7280]">You can still log any waste type later.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Password or PIN *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Choose a password or PIN"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Confirm Password or PIN *</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password or PIN"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2F9E44]"
            >
              Register & Continue <ArrowRight size={16} />
            </Button>

            <p className="text-center text-xs text-[#6B7280]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/picker/start')}
                className="font-semibold text-[#238636] hover:underline"
              >
                Log in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, Button } from '../../components';
import apiClient from '../../api/axios';
import { clearPickerSession } from '../utils/pickerSession';
import { setAuthSession } from '../../utils/auth';
import { Recycle, ArrowRight } from 'lucide-react';
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];
const AGE_GROUP_OPTIONS = ['Below 18', '18-24', '25-35', 'Above 35'];
const DIVISIONS = ['Kawempe', 'Makindye', 'Nakawa', 'Rubaga', 'Central'];
const WASTE_TYPES = [
  { value: 'PLASTIC', label: 'Plastic' },
  { value: 'MIXED_RECYCLABLES', label: 'I collect many types / Mixed recyclables' },
  { value: 'ORGANIC', label: 'Organic' },
  { value: 'E_WASTE', label: 'E-Waste' },
  { value: 'METAL_CARDBOARD', label: 'Metal & Cardboard' },
];

export default function PickerRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const authEnforced = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: '',
    age_group: '',
    division: '',
    main_waste_type: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ['name', 'phone', 'gender', 'age_group', 'division', 'main_waste_type', 'password', 'confirmPassword'];
    for (const field of required) {
      if (!form[field]?.trim()) {
        setError(`${field.replace(/_/g, ' ')} is required`);
        return false;
      }
    }

    if (form.password.length < 4) {
      setError('Password or PIN must be at least 4 characters');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password/PIN confirmation does not match');
      return false;
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
        const createdPicker = response.data.data;

        const hasAdminAuth = Boolean(getAuthToken());

        if (hasAdminAuth) {
          try {
            await apiClient.post('/users', {
              name: createdPicker.name,
              phone: createdPicker.phone,
              password: form.password,
              role: 'PICKER',
              picker_id: createdPicker.id,
              status: 'ACTIVE',
            });

            const loginResponse = await apiClient.post('/auth/login', {
              identifier: createdPicker.phone,
              password: form.password,
            });

            if (loginResponse.data?.success && loginResponse.data.data?.token && loginResponse.data.data?.user) {
              setAuthSession(loginResponse.data.data.token, loginResponse.data.data.user);
              clearPickerSession();
              navigate('/picker/dashboard', { replace: true });
              return;
            }
          } catch (linkError) {
            console.error('[PickerRegister] Linked user creation failed:', linkError);
          }
        }

        if (!authEnforced) {
          setPickerSession(createdPicker);
          navigate('/picker/dashboard', { replace: true });
          return;
        }

        clearPickerSession();
        navigate('/login', {
          replace: true,
          state: { message: 'Registration complete. Please login.' },
        });
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
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/picker/start')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Start
        </button>
      </div>

      <div className="rounded-3xl border border-[#BDE5BF] bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_70%)] p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#238636] shadow-sm">
            <Recycle size={30} />
          </div>
          <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>
            Register as Picker
          </h1>
          <p className="text-sm text-[#6B7280]">Fill in your information.</p>
        </div>

        <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
                  const response = await apiClient.post('/auth/register-picker', {
                    name: form.name,
                    phone: form.phone,
                    gender: form.gender,
                    age_group: form.age_group,
                    division: form.division,
                    main_waste_type: form.main_waste_type,
                    password: form.password,
                    confirmPassword: form.confirmPassword,
                  });
            </div>
                  if (response.data?.success && response.data.data?.token && response.data.data?.user) {
                    setAuthSession(response.data.data.token, response.data.data.user);
                    clearPickerSession();
                    navigate('/picker/dashboard', { replace: true });
                    return;
                  }

                  if (response.data?.success) {
                    clearPickerSession();
                    navigate('/login', {
                      replace: true,
                      state: { message: 'Registration successful. Please login.' },
                    });
                    return;
                  }

                  setError(response.data?.message || 'Registration failed');
                } catch (err) {
                  console.error('[PickerRegister] Error:', err);
                  const message = err.response?.data?.message || err.message;
                  if (message.includes('duplicate') || message.includes('already exists') || message.includes('registered')) {
                    setError('Phone number already registered. Try /picker/start to login.');
                  } else {
                    setError(message || 'Failed to register');
                  }
                } finally {
                  setLoading(false);
                }
              };

            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1">Waste type you mostly collect *</label>
              <select
                name="main_waste_type"
                value={form.main_waste_type}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              >
                <option value="">Select waste type</option>
                {WASTE_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
              <p className="mt-2 text-xs text-[#6B7280]">You can still log any waste type later.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1">Password or PIN *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Choose a password or PIN"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-1">Confirm Password or PIN *</label>
              <input
                type="password"
                name="confirm_password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password or PIN"
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2F9E44]"
            >
              Register & Continue <ArrowRight size={16} />
            </Button>

            <p className="text-center text-xs text-[#6B7280]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/picker/start')}
                className="font-semibold text-[#238636] hover:underline"
              >
                Log in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

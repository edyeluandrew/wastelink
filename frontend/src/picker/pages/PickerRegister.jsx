import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recycle } from 'lucide-react';
import apiClient from '../../api/axios';
import { Button, LoadingState } from '../../components';
import { setAuthSession } from '../../utils/auth';
import { clearPickerSession } from '../utils/pickerSession';
import { useCityDivisions } from '../../hooks/useCityDivisions';
import { useCities } from '../../hooks/useCities';
import { formatCityLabel, DEFAULT_CITY } from '../../utils/city';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const AGE_GROUP_OPTIONS = ['Below 18', '18-24', '25-35', 'Above 35'];

const REQUIRED_FIELDS = ['name', 'phone', 'gender', 'age_group', 'city', 'division', 'password', 'confirmPassword'];

export default function PickerRegister() {
  const navigate = useNavigate();
  const { cities, defaultCity, loading: citiesLoading } = useCities({ usePublic: true, pilotOnly: false });
  const openCity = defaultCity || DEFAULT_CITY;
  const isCityOpen = (city) => city.is_default || city.slug === openCity;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: '',
    age_group: '',
    city: '',
    division: '',
    password: '',
    confirmPassword: '',
  });
  const { divisionNames, loading: divisionsLoading } = useCityDivisions({
    usePublic: true,
    city: citiesLoading || !form.city ? '' : form.city,
  });

  useEffect(() => {
    if (!citiesLoading && openCity && !form.city) {
      setForm((prev) => ({ ...prev, city: openCity }));
    }
  }, [openCity, citiesLoading, form.city]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'city') {
      handleCityChange(e);
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedCityMeta = cities.find((entry) => entry.slug === form.city);
  const canPickDivision = Boolean(selectedCityMeta && isCityOpen(selectedCityMeta));

  const handleCityChange = (e) => {
    const value = e.target.value;
    const cityMeta = cities.find((entry) => entry.slug === value);
    if (!cityMeta || !isCityOpen(cityMeta)) return;
    setForm((prev) => ({ ...prev, city: value, division: '' }));
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

  const handleRegister = async (e) => {
    e.preventDefault();

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
        city: form.city,
        division: form.division,
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
      <div className="mb-4 flex gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Home
        </button>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Login
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
              <label className="mb-1 block text-sm font-semibold text-[#111111]">City *</label>
              <select
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading || citiesLoading}
              >
                <option value="">Select city</option>
                {cities.map((city) => {
                  const open = isCityOpen(city);
                  return (
                    <option key={city.slug} value={city.slug} disabled={!open}>
                      {city.name || formatCityLabel(city.slug)}{open ? '' : ' (coming soon)'}
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-xs text-[#6B7280]">
                Only {formatCityLabel(openCity)} is open for registration right now. More cities coming soon.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#111111]">Division *</label>
              <select
                name="division"
                value={form.division}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-sm focus:border-[#238636] focus:outline-none"
                disabled={loading || citiesLoading || divisionsLoading || !canPickDivision}
              >
                <option value="">
                  {!canPickDivision
                    ? 'Select an open city first'
                    : divisionsLoading
                      ? 'Loading divisions...'
                      : 'Select division'}
                </option>
                {divisionNames.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
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

            <Button type="submit" disabled={loading || citiesLoading} className="flex w-full items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2F9E44]">
              Register & Continue
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

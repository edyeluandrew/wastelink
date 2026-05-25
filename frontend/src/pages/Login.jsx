import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components';
import apiClient from '../api/axios';
import { getAuthToken, getDefaultRouteForRole, getUserRole, setAuthSession } from '../utils/auth';
import { Lock, Mail, ShieldCheck, LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (getAuthToken()) {
      navigate(getDefaultRouteForRole(getUserRole()), { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Email or phone and password are required');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email: identifier.trim(),
        identifier: identifier.trim(),
        password,
      });

      if (response.data?.success && response.data.data?.token && response.data.data?.user) {
        setAuthSession(response.data.data.token, response.data.data.user);
        navigate(getDefaultRouteForRole(response.data.data.user.role), { replace: true });
        return;
      }

      setError(response.data?.message || 'Login failed');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#EAF6EA_0%,#F8F9FA_45%,#FFFFFF_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#BDE5BF] bg-white shadow-[0_20px_80px_rgba(17,17,17,0.08)] md:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between bg-[linear-gradient(135deg,#238636_0%,#2F9E44_100%)] p-8 text-white md:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                <ShieldCheck size={16} /> Super Admin Access
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl" style={{ fontFamily: 'Orbitron' }}>
                WasteLink Uganda
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/85 md:text-base">
                Sign in to access WasteLink. Your dashboard opens based on your role.
              </p>
            </div>

            <div className="mt-10 grid gap-3 text-sm text-white/90">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                Role-Based Access
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                Secure JWT session for authenticated users
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <div className="mb-8">
              {location.state?.message && (
                <div className="mb-4 rounded-2xl border border-[#BDE5BF] bg-[#EAF6EA] px-4 py-3 text-sm font-medium text-[#238636]">
                  {location.state.message}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button className={`px-3 py-2 rounded-full ${!showRegister ? 'bg-[#238636] text-white' : 'bg-transparent text-[#6B7280]'}`} onClick={() => setShowRegister(false)}>Login</button>
                <button className={`px-3 py-2 rounded-full ${showRegister ? 'bg-[#238636] text-white' : 'bg-transparent text-[#6B7280]'}`} onClick={() => setShowRegister(true)}>Register as Picker</button>
              </div>

              {!showRegister ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#238636]">Login</p>
                  <h2 className="mt-2 text-3xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>
                    Sign in to WasteLink
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">Use your registered email or phone number and password/PIN.</p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-2xl font-bold text-[#111111]">Register as a Picker</h2>
                  <p className="mt-2 text-sm text-[#6B7280]">Picker registration is for waste pickers only. Admins and agents receive accounts from the system administrator or city admin.</p>
                </>
              )}
            </div>
            {!showRegister ? (
              <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111111]">Email or phone</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-4 py-3 focus-within:border-[#238636]">
                  <Mail size={18} className="shrink-0 text-[#6B7280]" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="superadmin@example.com or 0770000000"
                    className="w-full bg-transparent text-sm outline-none"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#111111]">Password</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[#D9D9D9] bg-[#F8F9FA] px-4 py-3 focus-within:border-[#238636]">
                  <Lock size={18} className="shrink-0 text-[#6B7280]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm outline-none"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2F9E44]"
              >
                <LogIn size={16} /> {loading ? 'Signing in...' : 'Login'}
              </Button>
            </form>
            ) : (
              <div className="rounded-2xl border border-[#D9D9D9] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#111111] mb-4">Picker registration is public and intended for waste pickers only.</p>
                <Button onClick={() => navigate('/picker/register')} className="w-full bg-[#238636] text-white">Create Picker Account</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
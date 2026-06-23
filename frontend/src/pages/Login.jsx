import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components';
import apiClient from '../api/axios';
import { getAuthToken, getDefaultRouteForRole, getUserRole, setAuthSession } from '../utils/auth';
import { Lock, UserPlus, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('login');

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
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
        {/* Brand panel */}
        <div className="hidden flex-1 flex-col justify-center bg-[linear-gradient(135deg,#EAF6EA_0%,#FFFFFF_75%)] px-8 py-12 md:flex md:px-12">
          <div className="max-w-md">
            <div className="mb-6 flex items-center gap-3">
              <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-14 w-14 object-contain" />
              <div>
                <h1 className="font-brand text-3xl font-bold text-[#238636]">WasteLink Uganda</h1>
                <p className="text-sm text-[#6B7280]">Digital waste management</p>
              </div>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-[#6B7280]">
              Track waste collections, manage verifications, and ensure fair earnings in your city.
            </p>
            <div className="space-y-2 text-sm text-[#6B7280]">
              {['Fast and secure login', 'Track collections in real time', 'Transparent earnings'].map((item) => (
                <p key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#238636]" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <img src="/brand/wastelink-icon.png" alt="WasteLink" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="font-brand text-xl font-bold text-[#238636]">WasteLink Uganda</h1>
                <p className="text-xs text-[#6B7280]">Sign in to continue</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex rounded-2xl bg-[#F8F9FA] p-1">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(''); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                    tab === 'login' ? 'bg-white text-[#238636] shadow-sm' : 'text-[#6B7280]'
                  }`}
                >
                  <Lock size={16} />
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(''); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                    tab === 'register' ? 'bg-white text-[#238636] shadow-sm' : 'text-[#6B7280]'
                  }`}
                >
                  <UserPlus size={16} />
                  Register
                </button>
              </div>

              {tab === 'login' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-[#111111]">Welcome back</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">Sign in with your credentials</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-[#111111]">Email or Phone</label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-base focus:border-[#238636] focus:outline-none focus:ring-2 focus:ring-[#238636]/20"
                        placeholder="user@gmail.com or +256701234567"
                        required
                        disabled={loading}
                        autoComplete="username"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-[#111111]">Password or PIN</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-[#D9D9D9] px-4 py-3 text-base focus:border-[#238636] focus:outline-none focus:ring-2 focus:ring-[#238636]/20"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        autoComplete="current-password"
                      />
                    </div>

                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-2xl bg-[#238636] py-3 font-semibold text-white hover:bg-[#2F9E44] disabled:opacity-50"
                    >
                      {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                  </form>
                </>
              )}

              {tab === 'register' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-[#111111]">Get started</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">Create your picker account</p>
                  </div>

                  <div className="space-y-4 rounded-2xl bg-[#F8F9FA] p-4">
                    <p className="text-sm text-[#6B7280]">
                      Sign up to track your waste collections and earnings in real time.
                    </p>
                    <ul className="space-y-2 text-sm text-[#6B7280]">
                      <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#238636]" /> Log waste collections</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#238636]" /> Earn fair payments</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#238636]" /> Track your progress</li>
                    </ul>
                    <Button
                      onClick={() => navigate('/picker/register')}
                      className="w-full rounded-2xl bg-[#238636] py-3 font-semibold text-white hover:bg-[#2F9E44]"
                    >
                      Create Picker Account
                    </Button>
                  </div>

                  <p className="mt-4 text-center text-sm text-[#6B7280]">
                    Already registered?{' '}
                    <button type="button" onClick={() => { setTab('login'); setError(''); }} className="font-semibold text-[#238636] hover:underline">
                      Login
                    </button>
                  </p>
                </>
              )}
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-[#6B7280]">
              WasteLink helps pickers, agents, and administrators track waste and ensure fair earnings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

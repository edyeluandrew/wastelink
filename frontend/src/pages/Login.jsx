import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components';
import apiClient from '../api/axios';
import { getAuthToken, getDefaultRouteForRole, getUserRole, setAuthSession } from '../utils/auth';
import { Lock, UserPlus } from 'lucide-react';

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
    <div className="flex h-screen bg-white">
      {/* Left Panel - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-center items-start px-12 bg-gradient-to-b from-[#f0f9ff] to-white">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-[#238636] mb-4">WasteLink Uganda</h1>
          <p className="text-base text-[#6B7280] mb-8">
            Sign in to access your workspace
          </p>
          <p className="text-sm text-[#6B7280] mb-8 leading-relaxed">
            Your dashboard opens based on your role. Admins manage system settings and reports. Agents verify waste collections. Pickers log and track earnings.
          </p>
          <div className="space-y-2 text-xs text-[#6B7280]">
            <p className="flex items-center gap-2"><span className="text-[#238636]">✓</span> Role-based access</p>
            <p className="flex items-center gap-2"><span className="text-[#238636]">✓</span> Secure JWT sessions</p>
            <p className="flex items-center gap-2"><span className="text-[#238636]">✓</span> Verified waste workflows</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Tab Navigation */}
          <div className="mb-8 flex border-b border-[#e5e7eb]">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'login'
                  ? 'border-b-2 border-[#238636] text-[#238636]'
                  : 'text-[#6B7280] hover:text-[#1f2937]'
              }`}
            >
              <Lock size={18} />
              Login
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                tab === 'register'
                  ? 'border-b-2 border-[#238636] text-[#238636]'
                  : 'text-[#6B7280] hover:text-[#1f2937]'
              }`}
            >
              <UserPlus size={18} />
              Register as Picker
            </button>
          </div>

          {/* Login Tab */}
          {tab === 'login' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Sign in to WasteLink</h2>
                <p className="text-sm text-[#6B7280]">
                  Enter your credentials to access your dashboard
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Email or Phone
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-2 border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#238636] transition-colors"
                    placeholder="admin@wastelink.com or +256701234567"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Password or PIN
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-[#d1d5db] rounded-lg focus:outline-none focus:border-[#238636] transition-colors"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#238636] text-white font-medium py-2 rounded-lg hover:bg-[#1a6b2d] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t border-[#e5e7eb]">
                <p className="text-xs text-[#6B7280] text-center">
                  Admins and agents: contact your system administrator to create your account.
                </p>
              </div>
            </>
          )}

          {/* Register as Picker Tab */}
          {tab === 'register' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Register as a Picker</h2>
                <p className="text-sm text-[#6B7280]">
                  Self-register as a waste picker to start logging waste and earning
                </p>
              </div>

              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-6 space-y-4">
                <p className="text-sm text-[#1f2937] leading-relaxed">
                  Picker registration is for waste pickers only. If you are a collection point agent or administrator, contact your system administrator or city admin to receive an account.
                </p>
                <ul className="space-y-2 text-sm text-[#6B7280]">
                  <li className="flex items-center gap-2"><span className="text-[#238636]">✓</span> Log waste collections with verification</li>
                  <li className="flex items-center gap-2"><span className="text-[#238636]">✓</span> Earn verified payments</li>
                  <li className="flex items-center gap-2"><span className="text-[#238636]">✓</span> Track your earnings and history</li>
                </ul>
                <Button
                  onClick={() => navigate('/picker/register')}
                  className="w-full bg-[#238636] text-white font-medium py-2 rounded-lg hover:bg-[#1a6b2d] transition-colors"
                >
                  Create Picker Account
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-[#e5e7eb]">
                <p className="text-xs text-[#6B7280] text-center">
                  Already registered? Go back to{' '}
                  <button
                    onClick={() => { setTab('login'); setError(''); }}
                    className="text-[#238636] font-medium hover:underline"
                  >
                    login
                  </button>
                  .
                </p>
              </div>
            </>
          )}

          {/* Back to Home Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-[#238636] hover:underline font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
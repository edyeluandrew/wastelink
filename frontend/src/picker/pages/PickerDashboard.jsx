import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingState, ErrorState, Button } from '../../components';
import PickerStatCard from '../components/PickerStatCard';
import PickerJobCard from '../components/PickerJobCard';
import apiClient from '../../api/axios';
import { getCurrentPicker, getCurrentPickerId } from '../utils/pickerSession';
import { formatUGX } from '../../utils/formatters';
import { Wind, FileText, Wallet } from 'lucide-react';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

export default function PickerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const picker = getCurrentPicker();
  const pickerId = getCurrentPickerId();

  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(location.state?.toast || null);

  useEffect(() => {
    if (location.state?.toast) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state?.toast, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!pickerId) {
      navigate(AUTH_ENFORCED ? '/login' : '/picker/start', { replace: true });
      return;
    }
    
    fetchDashboardData();
  }, [pickerId, navigate]);

  const fetchDashboardData = async () => {
    if (!pickerId) return;

    setLoading(true);
    setError(null);

    try {
      const [logsRes, balanceRes] = await Promise.all([
        apiClient.get(`/waste-logs?picker_id=${pickerId}`),
        apiClient.get('/withdrawals/balance'),
      ]);

      if (logsRes.data?.success) {
        setLogs(logsRes.data.data || []);
      }

      if (balanceRes.data?.success) {
        setBalance(balanceRes.data.data);
      }
    } catch (err) {
      console.error('[PickerDashboard] Error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchDashboardData} />;
  }

  // Calculate stats
  const pending = logs.filter(l => l.status === 'PENDING').length;
  const verified = logs.filter(l => l.status === 'VERIFIED').length;
  const paid = logs.filter(l => l.status === 'PAID').length;
  const totalKg = logs.reduce((sum, l) => sum + (l.verified_kg || 0), 0);
  const availableBalance = balance?.available_balance ?? balance?.available_to_withdraw ?? 0;
  const processingBalance = balance?.payout_processing_balance ?? 0;
  const totalPaid = balance?.total_paid ?? 0;
  const pendingVerification = balance?.pending_logs_count ?? pending;

  // Recent jobs — newest first
  const recentJobs = [...logs]
    .sort((a, b) => new Date(b.logged_at || b.created_at) - new Date(a.logged_at || a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-900">
          {toast}
        </div>
      )}
      {/* Welcome Card */}
      <div className="bg-green-100 border border-green-300 rounded-lg p-5">
        <p className="text-lg font-bold text-green-900 mb-1">
          Welcome, {picker.name}!
        </p>
        <p className="text-sm text-green-800 mb-3">
          Code: <span className="font-mono font-semibold">{picker.picker_code}</span>
        </p>
        <p className="text-xs text-green-700">
          {picker.division} â€¢ {picker.main_waste_type}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <PickerStatCard icon="â³" label="Pending" value={pending} color="amber" />
        <PickerStatCard icon="âœ…" label="Verified" value={verified} color="green" />
        <PickerStatCard icon="ðŸ’³" label="Paid" value={paid} color="blue" />
        <PickerStatCard icon="âš–ï¸" label="Total Kg" value={totalKg} color="green" />
      </div>

      {/* Earnings Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-100 border border-green-300 rounded-lg p-4">
          <p className="text-xs text-green-700 font-medium mb-1">Withdrawable</p>
          <p className="text-2xl font-bold text-green-900">{formatUGX(availableBalance)}</p>
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
          <p className="text-xs text-purple-700 font-medium mb-1">Processing</p>
          <p className="text-2xl font-bold text-purple-900">{formatUGX(processingBalance)}</p>
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <p className="text-xs text-blue-700 font-medium mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-blue-900">{formatUGX(totalPaid)}</p>
        </div>
        {pendingVerification > 0 && (
          <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
            <p className="text-xs text-amber-700 font-medium mb-1">Awaiting Verification</p>
            <p className="text-2xl font-bold text-amber-900">{pendingVerification}</p>
          </div>
        )}
      </div>

      {availableBalance > 0 && (
        <Button
          onClick={() => navigate('/picker/earnings')}
          className="w-full bg-[#238636] text-white hover:bg-[#2F9E44]"
        >
          <Wallet className="w-5 h-5" /> Withdraw {formatUGX(availableBalance)}
        </Button>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => navigate('/picker/log-waste')}
          className="bg-green-700 text-white hover:bg-green-800"
        >
          <FileText className="w-5 h-5" /> Log Waste
        </Button>
        <Button
          onClick={() => navigate('/picker/earnings')}
          className="bg-blue-700 text-white hover:bg-blue-800"
        >
          <Wallet className="w-5 h-5" /> My Earnings
        </Button>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Jobs</h2>
            <button
              onClick={() => navigate('/picker/jobs')}
              className="text-sm text-green-700 font-semibold hover:underline"
            >
              View all â†’
            </button>
          </div>
          <div>
            {recentJobs.map(job => (
              <PickerJobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {logs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No jobs yet</p>
          <Button
            onClick={() => navigate('/picker/log-waste')}
            className="bg-green-700 text-white hover:bg-green-800 mx-auto"
          >
            Log your first waste
          </Button>
        </div>
      )}
    </div>
  );
}




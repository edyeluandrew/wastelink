import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, Button } from '../../components';
import PickerStatCard from '../components/PickerStatCard';
import PickerJobCard from '../components/PickerJobCard';
import apiClient from '../../api/axios';
import { getPickerSession } from '../utils/pickerSession';
import { formatUGX } from '../../utils/formatters';

export default function PickerDashboard() {
  const navigate = useNavigate();
  const picker = getPickerSession();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!picker?.id) {
      navigate('/picker/start');
      return;
    }
    
    fetchDashboardData();
  }, [picker?.id, navigate]);

  const fetchDashboardData = async () => {
    if (!picker?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/waste-logs?picker_id=${picker.id}`);
      
      if (response.data?.success) {
        const allLogs = response.data.data || [];
        setLogs(allLogs);
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
  const totalEarnings = logs.reduce((sum, l) => {
    if (l.status === 'PAID' || l.status === 'VERIFIED') {
      return sum + (l.earning?.amount || 0);
    }
    return sum;
  }, 0);
  const pendingEarnings = logs.reduce((sum, l) => {
    if (l.status === 'VERIFIED' && l.earning?.status !== 'PAID') {
      return sum + (l.earning?.amount || 0);
    }
    return sum;
  }, 0);

  // Recent jobs
  const recentJobs = logs.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-green-100 border border-green-300 rounded-lg p-5">
        <p className="text-lg font-bold text-green-900 mb-1">
          Welcome, {picker.name}! 👋
        </p>
        <p className="text-sm text-green-800 mb-3">
          Code: <span className="font-mono font-semibold">{picker.picker_code}</span>
        </p>
        <p className="text-xs text-green-700">
          {picker.division} • {picker.main_waste_type}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <PickerStatCard icon="⏳" label="Pending" value={pending} color="amber" />
        <PickerStatCard icon="✅" label="Verified" value={verified} color="green" />
        <PickerStatCard icon="💳" label="Paid" value={paid} color="blue" />
        <PickerStatCard icon="⚖️" label="Total Kg" value={totalKg} color="green" />
      </div>

      {/* Earnings Cards */}
      <div className="space-y-3">
        <div className="bg-green-100 border border-green-300 rounded-lg p-4">
          <p className="text-xs text-green-700 font-medium mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-green-900">{formatUGX(totalEarnings)}</p>
        </div>

        {pendingEarnings > 0 && (
          <div className="bg-amber-100 border border-amber-300 rounded-lg p-4">
            <p className="text-xs text-amber-700 font-medium mb-1">Pending Earnings</p>
            <p className="text-2xl font-bold text-amber-900">{formatUGX(pendingEarnings)}</p>
            <p className="text-xs text-amber-700 mt-1">Awaiting verification completion</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => navigate('/picker/log-waste')}
          className="bg-green-700 text-white hover:bg-green-800"
        >
          📝 Log Waste
        </Button>
        <Button
          onClick={() => navigate('/picker/earnings')}
          className="bg-blue-700 text-white hover:bg-blue-800"
        >
          💰 My Earnings
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
              View all →
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

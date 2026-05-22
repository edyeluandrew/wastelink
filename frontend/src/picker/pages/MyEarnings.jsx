import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import apiClient from '../../api/axios';
import { getPickerSession } from '../utils/pickerSession';
import { formatUGX, formatDate } from '../../utils/formatters';

export default function MyEarnings() {
  const navigate = useNavigate();
  const picker = getPickerSession();

  const [earnings, setEarnings] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!picker?.id) {
      navigate('/picker/start');
      return;
    }
    
    fetchEarnings();
  }, [picker?.id, navigate]);

  const fetchEarnings = async () => {
    if (!picker?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/waste-logs?picker_id=${picker.id}`);
      
      if (response.data?.success) {
        const allJobs = response.data.data || [];
        
        // Calculate earnings
        const verified = allJobs.filter(j => j.status === 'VERIFIED' || j.status === 'PAID');
        const totalEarnings = verified.reduce((sum, j) => sum + (j.earning?.amount || 0), 0);
        const paidEarnings = allJobs
          .filter(j => j.status === 'PAID')
          .reduce((sum, j) => sum + (j.earning?.amount || 0), 0);
        const pendingEarnings = allJobs
          .filter(j => j.status === 'VERIFIED' && (!j.earning?.status || j.earning?.status !== 'PAID'))
          .reduce((sum, j) => sum + (j.earning?.amount || 0), 0);
        const totalKg = verified.reduce((sum, j) => sum + (j.verified_kg || 0), 0);
        const paidJobs = allJobs.filter(j => j.status === 'PAID').length;
        const unpaidJobs = allJobs.filter(j => j.status === 'VERIFIED').length;

        setEarnings({
          total: totalEarnings,
          paid: paidEarnings,
          pending: pendingEarnings,
          totalKg,
          paidJobs,
          unpaidJobs,
        });

        // Set jobs with earnings for display
        const earningJobs = verified
          .filter(j => j.earning?.amount > 0)
          .sort((a, b) => new Date(b.verified_at || b.logged_at) - new Date(a.verified_at || a.logged_at));
        setJobs(earningJobs);
      }
    } catch (err) {
      console.error('[MyEarnings] Error:', err);
      setError(err.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your earnings..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchEarnings} />;
  }

  if (!earnings) {
    return <EmptyState title="No earnings yet" message="Verify some waste to start earning" icon="💰" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Earnings</h1>

      {/* Main Earnings Cards */}
      <div className="space-y-3">
        <div className="bg-green-100 border border-green-300 rounded-lg p-5">
          <p className="text-xs text-green-700 font-medium mb-1">Total Earnings</p>
          <p className="text-3xl font-bold text-green-900">{formatUGX(earnings.total)}</p>
          <p className="text-xs text-green-700 mt-2">{earnings.paidJobs + earnings.unpaidJobs} verified jobs</p>
        </div>

        {earnings.pending > 0 && (
          <div className="bg-amber-100 border border-amber-300 rounded-lg p-5">
            <p className="text-xs text-amber-700 font-medium mb-1">Pending Payment</p>
            <p className="text-2xl font-bold text-amber-900">{formatUGX(earnings.pending)}</p>
            <p className="text-xs text-amber-700 mt-2">Waiting for payout - {earnings.unpaidJobs} jobs</p>
          </div>
        )}

        {earnings.paid > 0 && (
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-5">
            <p className="text-xs text-blue-700 font-medium mb-1">Already Paid</p>
            <p className="text-2xl font-bold text-blue-900">{formatUGX(earnings.paid)}</p>
            <p className="text-xs text-blue-700 mt-2">{earnings.paidJobs} completed payments</p>
          </div>
        )}

        <div className="bg-purple-100 border border-purple-300 rounded-lg p-5">
          <p className="text-xs text-purple-700 font-medium mb-1">Verified Weight</p>
          <p className="text-2xl font-bold text-purple-900">{earnings.totalKg} kg</p>
          <p className="text-xs text-purple-700 mt-2">Total waste verified</p>
        </div>
      </div>

      {/* Earnings History */}
      {jobs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Earnings History</h2>
          
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="bg-white border border-gray-300 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{job.job_code}</p>
                    <p className="text-sm text-gray-600">{job.waste_type}</p>
                  </div>
                  {job.earning?.amount && (
                    <p className="font-bold text-green-700 text-lg">
                      {formatUGX(job.earning.amount)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                  <div>Verified: {job.verified_kg || 0} kg</div>
                  <div>
                    {job.status === 'PAID' ? '✅ Paid' : job.status === 'VERIFIED' ? '⏳ Pending' : job.status}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  {formatDate(job.verified_at || job.logged_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No verified earnings yet</p>
        </div>
      )}
    </div>
  );
}

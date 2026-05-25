import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../../components';
import PickerJobCard from '../components/PickerJobCard';
import apiClient from '../../api/axios';
import { getCurrentPickerId } from '../utils/pickerSession';
import { Briefcase, Filter } from 'lucide-react';
import { formatUGX, formatDate } from '../../utils/formatters';
import { getEarningAmount, getEarningStatus } from '../../utils/earningsHelper';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PAID', label: 'Paid' },
];

export default function MyJobs() {
  const navigate = useNavigate();
  const pickerId = getCurrentPickerId();

  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  useEffect(() => {
    if (!pickerId) {
      navigate(AUTH_ENFORCED ? '/login' : '/picker/start', { replace: true });
      return;
    }
    
    fetchJobs();
  }, [pickerId, navigate]);

  useEffect(() => {
    // Apply filter
    if (selectedFilter === 'ALL') {
      setFilteredJobs(allJobs);
    } else {
      setFilteredJobs(allJobs.filter(j => j.status === selectedFilter));
    }
  }, [selectedFilter, allJobs]);

  const fetchJobs = async () => {
    if (!pickerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/waste-logs?picker_id=${pickerId}`);
      
      if (response.data?.success) {
        const jobs = response.data.data || [];
        // Sort by logged_at descending (newest first)
        jobs.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
        setAllJobs(jobs);
      }
    } catch (err) {
      console.error('[MyJobs] Error:', err);
      setError(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your jobs..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchJobs} />;
  }

  if (allJobs.length === 0) {
    return (
      <EmptyState
        title="No jobs yet"
        message="Log your first waste to get started"
        icon={Briefcase}
        actionLabel="Log Waste"
        onAction={() => navigate('/picker/log-waste')}
      />
    );
  }

  const summary = {
    total: allJobs.length,
    pending: allJobs.filter(job => job.status === 'PENDING').length,
    verified: allJobs.filter(job => job.status === 'VERIFIED').length,
    paid: allJobs.filter(job => job.status === 'PAID').length,
    rejected: allJobs.filter(job => job.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Job History</p>
          <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'Orbitron' }}>My Waste History</h1>
          <p className="text-sm text-[#6B7280]">Track every job from log to payment.</p>
        </div>
        <button
          onClick={() => navigate('/picker/dashboard')}
          className="text-sm font-semibold text-[#238636] hover:text-[#2F9E44]"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Total Jobs', value: summary.total, color: 'green' },
          { label: 'Pending', value: summary.pending, color: 'amber' },
          { label: 'Verified', value: summary.verified, color: 'green' },
          { label: 'Paid', value: summary.paid, color: 'blue' },
          { label: 'Rejected', value: summary.rejected, color: 'red' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#111111]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#111111]">
          <Filter size={16} className="text-[#238636]" /> Filters
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedFilter === option.value
                  ? 'bg-[#238636] text-white'
                  : 'bg-[#F8F9FA] text-[#111111] hover:bg-[#EAF6EA]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-[#6B7280]">
        Showing {filteredJobs.length} {selectedFilter === 'ALL' ? 'jobs' : selectedFilter.toLowerCase()}
      </p>

      {filteredJobs.length > 0 ? (
        <div className="space-y-3">
          {filteredJobs.map(job => (
            <PickerJobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${selectedFilter.toLowerCase()} jobs`}
          message="Try another filter or log a new waste job."
          icon={Briefcase}
          actionLabel="Log Waste"
          onAction={() => navigate('/picker/log-waste')}
        />
      )}
    </div>
  );
}

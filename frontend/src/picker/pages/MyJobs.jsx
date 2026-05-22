import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState, EmptyState } from '../../components';
import PickerJobCard from '../components/PickerJobCard';
import apiClient from '../../api/axios';
import { getPickerSession } from '../utils/pickerSession';
import { Briefcase } from 'lucide-react';

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PAID', label: 'Paid' },
];

export default function MyJobs() {
  const navigate = useNavigate();
  const picker = getPickerSession();

  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  useEffect(() => {
    if (!picker?.id) {
      navigate('/picker/start');
      return;
    }
    
    fetchJobs();
  }, [picker?.id, navigate]);

  useEffect(() => {
    // Apply filter
    if (selectedFilter === 'ALL') {
      setFilteredJobs(allJobs);
    } else {
      setFilteredJobs(allJobs.filter(j => j.status === selectedFilter));
    }
  }, [selectedFilter, allJobs]);

  const fetchJobs = async () => {
    if (!picker?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/waste-logs?picker_id=${picker.id}`);
      
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
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Jobs</h1>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {FILTER_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              className={`px-3 py-1.5 rounded-full font-semibold text-sm whitespace-nowrap transition ${
                selectedFilter === option.value
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Job Count */}
      <p className="text-sm text-gray-600">
        {filteredJobs.length} {selectedFilter === 'ALL' ? 'job' : selectedFilter.toLowerCase()}{' '}
        {filteredJobs.length !== 1 ? 's' : ''}
      </p>

      {/* Jobs List */}
      {filteredJobs.length > 0 ? (
        <div>
          {filteredJobs.map(job => (
            <PickerJobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No {selectedFilter.toLowerCase()} jobs</p>
        </div>
      )}
    </div>
  );
}

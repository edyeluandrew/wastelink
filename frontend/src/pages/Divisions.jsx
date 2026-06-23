import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
  Button,
  Modal,
  StatusBadge,
} from '../components';
import { formatNumber, formatKg, formatCurrencyUGX } from '../utils/formatters';
import { formatCityLabel, resolveAppCity } from '../utils/city';
import { getAuthUser, normalizeRole } from '../utils/auth';
import api from '../api/axios';
import { TrendingUp, Users, Zap } from 'lucide-react';

export default function Divisions() {
  const authUser = getAuthUser();
  const city = resolveAppCity(authUser);
  const cityLabel = formatCityLabel(city);
  const canManage = ['SUPER_ADMIN', 'CITY_ADMIN'].includes(normalizeRole(authUser?.role));

  const [divisions, setDivisions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, summaryRes] = await Promise.all([
        api.get('/divisions/stats', { params: { city } }),
        api.get('/reports/summary'),
      ]);

      setDivisions(statsRes.data.data?.divisions || []);
      setSummary(summaryRes.data.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [city]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      alert('Enter a division name');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/divisions', { name: trimmed, city });
      setNewName('');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (division) => {
    const nextStatus = division.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = nextStatus === 'INACTIVE' ? 'deactivate' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${division.division}?`)) {
      return;
    }

    try {
      await api.patch(`/divisions/${division.id}`, { status: nextStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const bestDivision = divisions.reduce((best, current) => {
    return (current.total_verified_kg || 0) > (best.total_verified_kg || 0)
      ? current
      : best;
  }, divisions[0] || {});

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-wastelink-dark">Divisions</h2>
          <p className="text-sm text-wastelink-muted mt-1">{cityLabel} municipality</p>
        </div>
        {canManage && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Add Division
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Divisions Covered"
          value={formatNumber(divisions.length)}
          subtitle={`in ${cityLabel}`}
          icon={Users}
        />
        <StatCard
          title="Best Division"
          value={bestDivision.division || '-'}
          subtitle={formatKg(bestDivision.total_verified_kg || 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Verified Waste"
          value={formatKg(summary?.total_verified_kg || 0)}
          subtitle="across all divisions"
          icon={Zap}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-wastelink-dark mb-4">
          Division Performance
        </h3>
        {divisions.length === 0 ? (
          <EmptyState
            message="No divisions yet"
            subtext={canManage ? 'Add your first division to get started' : 'Contact your city admin to configure divisions'}
          />
        ) : (
          <DataTable
            columns={[
              'Division',
              'Status',
              'Total Pickers',
              'Active Pickers',
              'Collection Points',
              'Total Logs',
              'Pending',
              'Verified',
              'Rejected',
              'Paid',
              'Total KG',
              'Total Earnings',
              ...(canManage ? ['Actions'] : []),
            ]}
          >
            {divisions.map((division) => (
              <tr key={division.id} className="border-b border-wastelink-border hover:bg-gray-50">
                <td className="table-cell font-semibold text-wastelink-primary">
                  {division.division}
                </td>
                <td className="table-cell">
                  <StatusBadge status={division.status} />
                </td>
                <td className="table-cell">{formatNumber(division.total_pickers)}</td>
                <td className="table-cell">{formatNumber(division.active_pickers)}</td>
                <td className="table-cell">{formatNumber(division.collection_points)}</td>
                <td className="table-cell">{formatNumber(division.total_logs)}</td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                    {formatNumber(division.pending_logs)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    {formatNumber(division.verified_logs)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    {formatNumber(division.rejected_logs)}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {formatNumber(division.paid_logs)}
                  </span>
                </td>
                <td className="table-cell font-medium">
                  {formatKg(division.total_verified_kg)}
                </td>
                <td className="table-cell font-medium">
                  {formatCurrencyUGX(division.total_earnings)}
                </td>
                {canManage && (
                  <td className="table-cell">
                    <button
                      type="button"
                      onClick={() => toggleStatus(division)}
                      className="text-sm text-wastelink-primary hover:underline"
                    >
                      {division.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Division">
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-wastelink-muted">
            New division for {cityLabel}. Collection points and pickers can use this area once created.
          </p>
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Division name *
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              placeholder="e.g. Kakoba, Nyamitanga"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving...' : 'Create Division'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

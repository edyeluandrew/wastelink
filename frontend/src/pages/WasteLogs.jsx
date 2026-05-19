import { useEffect, useState } from 'react';
import { Plus, Search, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import {
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
  Modal,
  StatusBadge,
} from '../components';
import {
  formatKg,
  formatCurrencyUGX,
  formatDateTime,
  formatStatus,
} from '../utils/formatters';
import api from '../api/axios';

const WASTE_TYPES = ['PLASTIC', 'MIXED_RECYCLABLES', 'ORGANIC', 'E_WASTE', 'METAL_CARDBOARD'];
const DIVISIONS = ['Kawempe', 'Makindye', 'Nakawa', 'Rubaga', 'Central'];

const initialFormState = {
  picker_id: '',
  collection_point_id: '',
  waste_type: 'PLASTIC',
  estimated_kg: '',
};

export default function WasteLogs() {
  const [logs, setLogs] = useState([]);
  const [pickers, setPickers] = useState([]);
  const [collectionPoints, setCollectionPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Forms
  const [createForm, setCreateForm] = useState(initialFormState);
  const [selectedLog, setSelectedLog] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ verified_kg: '', notes: '' });
  const [rejectForm, setRejectForm] = useState({ reason: '' });

  // Filters
  const [filteredStatus, setFilteredStatus] = useState('');
  const [filteredType, setFilteredType] = useState('');
  const [filteredDivision, setFilteredDivision] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logsRes, pickersRes, pointsRes] = await Promise.all([
        api.get('/waste-logs'),
        api.get('/pickers'),
        api.get('/collection-points'),
      ]);
      setLogs(logsRes.data.data || []);
      setPickers(pickersRes.data.data || []);
      setCollectionPoints(pointsRes.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.picker_id || !createForm.collection_point_id || !createForm.estimated_kg) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/waste-logs', createForm);
      alert('Waste log created successfully');
      setCreateModalOpen(false);
      setCreateForm(initialFormState);
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyForm.verified_kg) {
      alert('Please enter verified weight');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/waste-logs/${selectedLog.id}/verify`, {
        verified_kg: parseFloat(verifyForm.verified_kg),
        notes: verifyForm.notes,
      });
      alert('Waste log verified successfully');
      setVerifyModalOpen(false);
      setVerifyForm({ verified_kg: '', notes: '' });
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/waste-logs/${selectedLog.id}/reject`, {
        reason: rejectForm.reason,
      });
      alert('Waste log rejected');
      setRejectModalOpen(false);
      setRejectForm({ reason: '' });
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (logId) => {
    try {
      await api.patch(`/waste-logs/${logId}/mark-paid`);
      alert('Marked as paid');
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSearchByJobCode = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a job code');
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/waste-logs/job/${searchQuery}`);
      setLogs([res.data.data] || []);
    } catch (err) {
      alert('Waste log not found');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchData();
  };

  const getFilteredLogs = () => {
    return logs.filter((log) => {
      if (filteredStatus && log.status !== filteredStatus) return false;
      if (filteredType && log.waste_type !== filteredType) return false;
      if (filteredDivision && log.division !== filteredDivision) return false;
      return true;
    });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const filteredLogs = getFilteredLogs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-wastelink-dark">Waste Logs</h2>
        <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus size={18} />
          Create Waste Log
        </Button>
      </div>

      {/* Search */}
      <div className="card flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by job code..."
          className="flex-1 border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
        />
        <Button onClick={handleSearchByJobCode} size="sm">
          <Search size={16} className="mr-1" /> Search
        </Button>
        {searchQuery && (
          <Button onClick={handleClearSearch} variant="secondary" size="sm">
            Clear
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-wastelink-dark mb-2">
            Status
          </label>
          <select
            value={filteredStatus}
            onChange={(e) => setFilteredStatus(e.target.value)}
            className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-wastelink-dark mb-2">
            Waste Type
          </label>
          <select
            value={filteredType}
            onChange={(e) => setFilteredType(e.target.value)}
            className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          >
            <option value="">All Types</option>
            {WASTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatStatus(type)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-wastelink-dark mb-2">
            Division
          </label>
          <select
            value={filteredDivision}
            onChange={(e) => setFilteredDivision(e.target.value)}
            className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          >
            <option value="">All Divisions</option>
            {DIVISIONS.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState message="No waste logs found" />
      ) : (
        <DataTable
          columns={[
            'Job Code',
            'Picker',
            'Waste Type',
            'Est. KG',
            'Ver. KG',
            'Collection Point',
            'Division',
            'Status',
            'Earning Amount',
            'Earning Status',
            'Date',
            'Actions',
          ]}
        >
          {filteredLogs.map((log) => (
            <tr key={log.id} className="border-b border-wastelink-border hover:bg-gray-50">
              <td className="table-cell font-medium text-wastelink-primary">{log.job_code}</td>
              <td className="table-cell text-sm">{log.picker_name}</td>
              <td className="table-cell text-sm">{formatStatus(log.waste_type)}</td>
              <td className="table-cell">{formatKg(log.estimated_kg)}</td>
              <td className="table-cell">{log.verified_kg ? formatKg(log.verified_kg) : '-'}</td>
              <td className="table-cell text-sm">{log.collection_point_name}</td>
              <td className="table-cell text-sm">{log.division}</td>
              <td className="table-cell">
                <StatusBadge status={log.status} />
              </td>
              <td className="table-cell">{log.amount ? formatCurrencyUGX(log.amount) : '-'}</td>
              <td className="table-cell">
                {log.earning_status ? <StatusBadge status={log.earning_status} /> : '-'}
              </td>
              <td className="table-cell text-xs">{formatDateTime(log.logged_at)}</td>
              <td className="table-cell space-x-1">
                {log.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setVerifyModalOpen(true);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                    >
                      <CheckCircle size={12} className="mr-1" /> Verify
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setRejectModalOpen(true);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      <XCircle size={12} className="mr-1" /> Reject
                    </button>
                  </>
                )}
                {log.status === 'VERIFIED' && (
                  <button
                    onClick={() => handleMarkPaid(log.id)}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                  >
                    <DollarSign size={12} className="mr-1" /> Mark Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateForm(initialFormState);
        }}
        title="Create Waste Log"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Picker *
            </label>
            <select
              value={createForm.picker_id}
              onChange={(e) => setCreateForm({ ...createForm, picker_id: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              <option value="">Select a picker</option>
              {pickers.map((picker) => (
                <option key={picker.id} value={picker.id}>
                  {picker.picker_code} - {picker.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Collection Point *
            </label>
            <select
              value={createForm.collection_point_id}
              onChange={(e) =>
                setCreateForm({ ...createForm, collection_point_id: e.target.value })
              }
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              <option value="">Select a collection point</option>
              {collectionPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.point_code} - {point.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Waste Type
            </label>
            <select
              value={createForm.waste_type}
              onChange={(e) => setCreateForm({ ...createForm, waste_type: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              {WASTE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatStatus(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Estimated Weight (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={createForm.estimated_kg}
              onChange={(e) => setCreateForm({ ...createForm, estimated_kg: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              placeholder="Weight in kg"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Creating...' : 'Create Log'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Verify Modal */}
      <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title="Verify Waste Log">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Verified Weight (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={verifyForm.verified_kg}
              onChange={(e) => setVerifyForm({ ...verifyForm, verified_kg: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              placeholder="Verified weight"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">Notes</label>
            <textarea
              value={verifyForm.notes}
              onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              placeholder="Optional notes"
              rows="3"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Verifying...' : 'Verify'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setVerifyModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Waste Log">
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Reason for Rejection
            </label>
            <textarea
              value={rejectForm.reason}
              onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              placeholder="Reason for rejection"
              rows="3"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRejectModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

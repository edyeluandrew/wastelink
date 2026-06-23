import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import {
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
  Modal,
  StatusBadge,
} from '../components';
import api from '../api/axios';
import { useCityDivisions } from '../hooks/useCityDivisions';

const buildInitialForm = (defaultDivision = '') => ({
  name: '',
  division: defaultDivision,
});

export default function CollectionPoints() {
  const { divisionNames, loading: divisionsLoading } = useCityDivisions();
  const defaultDivision = divisionNames[0] || '';

  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(buildInitialForm());
  const [filteredDivision, setFilteredDivision] = useState('');
  const [filteredStatus, setFilteredStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultDivision && !form.division) {
      setForm((prev) => ({ ...prev, division: defaultDivision }));
    }
  }, [defaultDivision]);

  const initialFormState = useMemo(() => buildInitialForm(defaultDivision), [defaultDivision]);
  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/collection-points');
      setPoints(res.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setForm(initialFormState);
    setModalOpen(true);
  };

  const openEditModal = (point) => {
    setIsEditing(true);
    setEditingId(point.id);
    setForm({
      name: point.name,
      division: point.division,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(initialFormState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.division) {
      alert('Please fill in name and division');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await api.patch(`/collection-points/${editingId}`, form);
        alert('Collection point updated successfully');
      } else {
        await api.post('/collection-points', form);
        alert('Collection point added successfully');
      }
      closeModal();
      fetchPoints();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (pointId) => {
    if (!window.confirm('Are you sure you want to deactivate this collection point?')) {
      return;
    }

    try {
      await api.patch(`/collection-points/${pointId}/deactivate`);
      alert('Collection point deactivated');
      fetchPoints();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const getFilteredPoints = () => {
    return points.filter((point) => {
      if (filteredDivision && point.division !== filteredDivision) return false;
      if (filteredStatus && point.status !== filteredStatus) return false;
      return true;
    });
  };

  if (loading || divisionsLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchPoints} />;

  const filteredPoints = getFilteredPoints();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-wastelink-dark">Collection Points</h2>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <Plus size={18} />
          Add Collection Point
        </Button>
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {divisionNames.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>

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
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredPoints.length === 0 ? (
        <EmptyState message="No collection points found" subtext="Add your first collection point" />
      ) : (
        <DataTable
          columns={[
            'Point Code',
            'Name',
            'Division',
            'Agent Name',
            'Agent Phone',
            'Status',
            'Actions',
          ]}
        >
          {filteredPoints.map((point) => (
            <tr key={point.id} className="border-b border-wastelink-border hover:bg-gray-50">
              <td className="table-cell font-medium text-wastelink-primary">
                {point.point_code}
              </td>
              <td className="table-cell">{point.name}</td>
              <td className="table-cell text-sm">{point.division}</td>
              <td className="table-cell text-sm">{point.agent_name || '—'}</td>
              <td className="table-cell text-sm">{point.agent_phone || '—'}</td>
              <td className="table-cell">
                <StatusBadge status={point.status} />
              </td>
              <td className="table-cell space-x-2">
                <button
                  onClick={() => openEditModal(point)}
                  className="text-wastelink-primary hover:text-wastelink-secondary transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                {point.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleDeactivate(point.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    Deactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Collection Point' : 'Add Collection Point'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              placeholder="Collection point name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Division *
            </label>
            <select
              value={form.division}
              onChange={(e) => setForm({ ...form, division: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              disabled={divisionNames.length === 0}
            >
              {divisionNames.length === 0 ? (
                <option value="">No divisions — create one under Divisions first</option>
              ) : (
                divisionNames.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))
              )}
            </select>
          </div>

          {!isEditing && (
            <p className="text-sm text-wastelink-muted">
              Assign an agent later under Users & Agents after the collection point is created.
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Saving...' : (isEditing ? 'Update Point' : 'Add Point')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
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

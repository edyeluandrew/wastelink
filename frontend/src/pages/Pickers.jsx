import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  DataTable,
  Modal,
  StatusBadge,
} from '../components';
import { formatStatus } from '../utils/formatters';
import api from '../api/axios';

const DIVISIONS = [
  'Kawempe',
  'Makindye',
  'Nakawa',
  'Rubaga',
  'Central',
];

const GENDERS = ['FEMALE', 'MALE', 'PREFER_NOT_TO_SAY'];
const AGE_GROUPS = ['Below 18', '18-24', '25-35', 'Above 35'];
const WASTE_TYPES = ['PLASTIC', 'MIXED_RECYCLABLES', 'ORGANIC', 'E_WASTE', 'METAL_CARDBOARD'];

const initialFormState = {
  name: '',
  phone: '',
  gender: 'MALE',
  age_group: '18-24',
  division: 'Kawempe',
  main_waste_type: 'PLASTIC',
};

export default function Pickers() {
  const [pickers, setPickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [filteredDivision, setFilteredDivision] = useState('');
  const [filteredGender, setFilteredGender] = useState('');
  const [filteredStatus, setFilteredStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPickers();
  }, []);

  const fetchPickers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/pickers');
      setPickers(res.data.data || []);
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

  const openEditModal = (picker) => {
    setIsEditing(true);
    setEditingId(picker.id);
    setForm({
      name: picker.name,
      phone: picker.phone,
      gender: picker.gender,
      age_group: picker.age_group,
      division: picker.division,
      main_waste_type: picker.main_waste_type,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(initialFormState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.phone) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await api.patch(`/pickers/${editingId}`, form);
        alert('Picker updated successfully');
      } else {
        await api.post('/pickers', form);
        alert('Picker added successfully');
      }
      closeModal();
      fetchPickers();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredPickers = () => {
    return pickers.filter((picker) => {
      if (filteredDivision && picker.division !== filteredDivision) return false;
      if (filteredGender && picker.gender !== filteredGender) return false;
      if (filteredStatus && picker.status !== filteredStatus) return false;
      return true;
    });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchPickers} />;

  const filteredPickers = getFilteredPickers();

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-wastelink-dark">Pickers Management</h2>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <Plus size={18} />
          Add Picker
        </Button>
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div>
          <label className="block text-sm font-medium text-wastelink-dark mb-2">
            Gender
          </label>
          <select
            value={filteredGender}
            onChange={(e) => setFilteredGender(e.target.value)}
            className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          >
            <option value="">All Genders</option>
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {formatStatus(gender)}
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
      {filteredPickers.length === 0 ? (
        <EmptyState message="No pickers found" subtext="Add your first picker to get started" />
      ) : (
        <DataTable
          columns={[
            'Picker Code',
            'Name',
            'Phone',
            'Gender',
            'Age Group',
            'Division',
            'Main Waste Type',
            'Status',
            'Actions',
          ]}
        >
          {filteredPickers.map((picker) => (
            <tr key={picker.id} className="border-b border-wastelink-border hover:bg-gray-50">
              <td className="table-cell font-medium text-wastelink-primary">
                {picker.picker_code}
              </td>
              <td className="table-cell">{picker.name}</td>
              <td className="table-cell text-sm">{picker.phone}</td>
              <td className="table-cell text-sm">{formatStatus(picker.gender)}</td>
              <td className="table-cell text-sm">{picker.age_group}</td>
              <td className="table-cell text-sm">{picker.division}</td>
              <td className="table-cell text-sm">{formatStatus(picker.main_waste_type)}</td>
              <td className="table-cell">
                <StatusBadge status={picker.status} />
              </td>
              <td className="table-cell">
                <button
                  onClick={() => openEditModal(picker)}
                  className="text-wastelink-primary hover:text-wastelink-secondary transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Picker' : 'Add New Picker'}
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
              placeholder="Picker name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Phone *
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              placeholder="Phone number"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {formatStatus(g)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">
                Age Group
              </label>
              <select
                value={form.age_group}
                onChange={(e) => setForm({ ...form, age_group: e.target.value })}
                className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              >
                {AGE_GROUPS.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Division
            </label>
            <select
              value={form.division}
              onChange={(e) => setForm({ ...form, division: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">
              Main Waste Type
            </label>
            <select
              value={form.main_waste_type}
              onChange={(e) => setForm({ ...form, main_waste_type: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              {WASTE_TYPES.map((wt) => (
                <option key={wt} value={wt}>
                  {formatStatus(wt)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Saving...' : (isEditing ? 'Update Picker' : 'Add Picker')}
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

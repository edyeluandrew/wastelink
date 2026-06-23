import { useEffect, useState } from 'react';
import { Plus, Edit2, History } from 'lucide-react';
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
import { getAuthUser, normalizeRole } from '../utils/auth';
import { resolveAppCity, DEFAULT_CITY } from '../utils/city';
import { useCities } from '../hooks/useCities';
import { formatCurrencyUGX } from '../utils/formatters';

const initialFormState = {
  name: '',
  description: '',
  reporting_category_id: '',
  price_per_kg: '0',
  is_payable: true,
  is_active: true,
  city: DEFAULT_CITY,
  reason: '',
};

export default function WasteTypes() {
  const authUser = getAuthUser();
  const isSuperAdmin = normalizeRole(authUser?.role) === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState('city');
  const [cityWasteTypes, setCityWasteTypes] = useState([]);
  const [reportingCategories, setReportingCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { cities, defaultCity } = useCities({ usePublic: false });
  const [cityFilter, setCityFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cityFilter && defaultCity) {
      setCityFilter(defaultCity);
    }
  }, [defaultCity, cityFilter]);

  useEffect(() => {
    fetchData();
  }, [cityFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (isSuperAdmin && cityFilter) params.city = cityFilter;

      const [typesRes, categoriesRes] = await Promise.all([
        api.get('/city-waste-types', { params }),
        api.get('/reporting-categories'),
      ]);

      setCityWasteTypes(typesRes.data.data || []);
      setReportingCategories(categoriesRes.data.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setForm({
      ...initialFormState,
      city: cityFilter || resolveAppCity(authUser),
      reporting_category_id: reportingCategories[0]?.id?.toString() || '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      reporting_category_id: String(item.reporting_category_id),
      price_per_kg: String(item.price_per_kg),
      is_payable: item.is_payable,
      is_active: item.is_active,
      city: item.city,
      reason: '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(initialFormState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name?.trim() || !form.reporting_category_id) {
      alert('Name and reporting category are required');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      reporting_category_id: parseInt(form.reporting_category_id, 10),
      price_per_kg: parseFloat(form.price_per_kg) || 0,
      is_payable: Boolean(form.is_payable),
      is_active: Boolean(form.is_active),
    };

    if (isSuperAdmin && !isEditing) {
      payload.city = form.city;
    }

    if (isEditing && form.reason?.trim()) {
      payload.reason = form.reason.trim();
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await api.patch(`/city-waste-types/${editingId}`, payload);
        alert('City waste type updated');
      } else {
        await api.post('/city-waste-types', payload);
        alert('City waste type created');
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (item) => {
    const nextActive = !item.is_active;
    const reason = window.prompt(
      nextActive ? 'Reason for reactivating (optional):' : 'Reason for deactivating (optional):'
    );

    try {
      await api.patch(`/city-waste-types/${item.id}`, {
        is_active: nextActive,
        reason: reason || undefined,
      });
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const openHistory = async (item) => {
    setHistoryLoading(true);
    setHistoryModalOpen(true);
    setHistory([]);
    try {
      const res = await api.get(`/city-waste-types/${item.id}/history`);
      setHistory(res.data.data || []);
    } catch (err) {
      alert('Failed to load history: ' + (err.response?.data?.message || err.message));
      setHistoryModalOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCategoryToggle = async (category) => {
    try {
      await api.patch(`/reporting-categories/${category.id}`, {
        is_active: !category.is_active,
      });
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const uniqueCities = [...new Set(cityWasteTypes.map((t) => t.city))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-wastelink-dark">Waste Types</h2>
          <p className="text-sm text-wastelink-muted mt-1">
            City admins manage local waste types and pricing. Super admins manage global reporting categories.
          </p>
        </div>
        {activeTab === 'city' && (
          <Button onClick={openAddModal} className="flex items-center gap-2">
            <Plus size={18} />
            Add City Waste Type
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-wastelink-border">
        <button
          type="button"
          onClick={() => setActiveTab('city')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            activeTab === 'city'
              ? 'border-wastelink-primary text-wastelink-primary'
              : 'border-transparent text-wastelink-muted hover:text-wastelink-dark'
          }`}
        >
          City Waste Types
        </button>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === 'categories'
                ? 'border-wastelink-primary text-wastelink-primary'
                : 'border-transparent text-wastelink-muted hover:text-wastelink-dark'
            }`}
          >
            Reporting Categories
          </button>
        )}
      </div>

      {activeTab === 'city' && (
        <>
          {isSuperAdmin && (
            <div className="card max-w-xs">
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Filter by city</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm"
              >
                <option value="">All cities</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {cityWasteTypes.length === 0 ? (
            <EmptyState message="No city waste types yet. Create one to get started." />
          ) : (
            <DataTable
              columns={[
                ...(isSuperAdmin ? ['City'] : []),
                'Name',
                'Reporting Category',
                'Price/kg',
                'Payable',
                'Status',
                'Actions',
              ]}
            >
              {cityWasteTypes.map((item) => (
                <tr key={item.id} className="border-b border-wastelink-border">
                  {isSuperAdmin && (
                    <td className="table-cell capitalize">{item.city}</td>
                  )}
                  <td className="table-cell font-medium">{item.name}</td>
                  <td className="table-cell">{item.reporting_category_name}</td>
                  <td className="table-cell">{formatCurrencyUGX(item.price_per_kg)}</td>
                  <td className="table-cell">{item.is_payable ? 'Payable' : 'Track-only'}</td>
                  <td className="table-cell">
                    <StatusBadge status={item.is_active ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 text-sm text-wastelink-primary hover:underline"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className="text-sm text-wastelink-muted hover:underline"
                      >
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistory(item)}
                        className="inline-flex items-center gap-1 text-sm text-wastelink-muted hover:underline"
                      >
                        <History size={14} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </>
      )}

      {activeTab === 'categories' && isSuperAdmin && (
        <DataTable columns={['Name', 'Slug', 'Description', 'Status', 'Actions']}>
          {reportingCategories.map((cat) => (
            <tr key={cat.id} className="border-b border-wastelink-border">
              <td className="table-cell font-medium">{cat.name}</td>
              <td className="table-cell text-wastelink-muted">{cat.slug}</td>
              <td className="table-cell">{cat.description || '—'}</td>
              <td className="table-cell">
                <StatusBadge status={cat.is_active ? 'ACTIVE' : 'INACTIVE'} />
              </td>
              <td className="table-cell">
                <button
                  type="button"
                  onClick={() => handleCategoryToggle(cat)}
                  className="text-sm text-wastelink-primary hover:underline"
                >
                  {cat.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal isOpen={modalOpen} title={isEditing ? 'Edit City Waste Type' : 'Add City Waste Type'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSuperAdmin && !isEditing && (
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm"
              placeholder="e.g. Kaveera / Polythene"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm h-20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reporting Category *</label>
            <select
              value={form.reporting_category_id}
              onChange={(e) => setForm({ ...form, reporting_category_id: e.target.value })}
              className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm"
              required
            >
              <option value="">Select category</option>
              {reportingCategories.filter((c) => c.is_active).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price per kg (UGX)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.price_per_kg}
              onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })}
              className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_payable}
                onChange={(e) => setForm({ ...form, is_payable: e.target.checked })}
              />
              Payable (uncheck for track-only)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
          {isEditing && (
            <div>
              <label className="block text-sm font-medium mb-1">Change reason (optional)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm"
                placeholder="e.g. Market price update"
              />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={historyModalOpen}
        title="Change History"
        onClose={() => setHistoryModalOpen(false)}
      >
        {historyLoading ? (
          <LoadingState message="Loading history..." />
        ) : history.length === 0 ? (
          <p className="text-sm text-wastelink-muted">No changes recorded yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-wastelink-border p-3 text-sm">
                <p className="font-semibold">{entry.change_type}</p>
                <p className="text-wastelink-muted text-xs mt-1">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
                {entry.reason && <p className="mt-1">Reason: {entry.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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

export default function Cities() {
  const authUser = getAuthUser();
  const isSuperAdmin = normalizeRole(authUser?.role) === 'SUPER_ADMIN';

  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', is_pilot: true, is_default: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchCities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/cities');
      setCities(res.data.data?.cities || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchCities();
  }, [isSuperAdmin]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('City name is required');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/cities', {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        is_pilot: form.is_pilot,
        is_default: form.is_default,
      });
      setForm({ name: '', slug: '', is_pilot: true, is_default: false });
      setModalOpen(false);
      fetchCities();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (city) => {
    const nextStatus = city.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`${nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} ${city.name}?`)) return;

    try {
      await api.patch(`/cities/${city.id}`, { status: nextStatus });
      fetchCities();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const setAsDefault = async (city) => {
    if (!window.confirm(`Set ${city.name} as the default pilot city?`)) return;
    try {
      await api.patch(`/cities/${city.id}`, { is_default: true });
      fetchCities();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (!isSuperAdmin) {
    return <EmptyState message="Only super admins can manage cities" />;
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchCities} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-wastelink-dark">Cities</h2>
          <p className="text-sm text-wastelink-muted mt-1">
            Manage pilot cities. Divisions, waste types, and reports are scoped per city.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
          <Plus size={18} />
          Add City
        </Button>
      </div>

      {cities.length === 0 ? (
        <EmptyState message="No cities configured" subtext="Add your first pilot city to get started" />
      ) : (
        <DataTable columns={['Name', 'Slug', 'Pilot', 'Default', 'Status', 'Actions']}>
          {cities.map((city) => (
            <tr key={city.id} className="border-b border-wastelink-border hover:bg-gray-50">
              <td className="table-cell font-semibold text-wastelink-primary">{city.name}</td>
              <td className="table-cell text-sm">{city.slug}</td>
              <td className="table-cell">{city.is_pilot ? 'Yes' : 'No'}</td>
              <td className="table-cell">{city.is_default ? 'Yes' : '—'}</td>
              <td className="table-cell">
                <StatusBadge status={city.status} />
              </td>
              <td className="table-cell space-x-3">
                {!city.is_default && city.status === 'ACTIVE' && (
                  <button type="button" onClick={() => setAsDefault(city)} className="text-sm text-wastelink-primary hover:underline">
                    Set default
                  </button>
                )}
                <button type="button" onClick={() => toggleStatus(city)} className="text-sm text-wastelink-primary hover:underline">
                  {city.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add City">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">City name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Mbarara, Jinja"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Slug (optional)</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full border border-wastelink-border rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. mbarara"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_pilot}
              onChange={(e) => setForm({ ...form, is_pilot: e.target.checked })}
            />
            Pilot city
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            Set as default city
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving...' : 'Create City'}
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

import { useEffect, useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import api from '../api/axios';
import {
  Button, LoadingState, ErrorState, EmptyState, DataTable, Modal, StatusBadge,
} from '../components';
import { useCityWasteTypes } from '../hooks/useCityWasteTypes';

const initialForm = {
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  location: '',
  waste_types_accepted: '',
  accepted_waste_type_ids: [],
  buying_capacity_kg_week: '',
  buying_capacity_kg_month: '',
  status: 'ACTIVE',
  create_user_account: true,
  user_email: '',
  user_password: '',
  user_name: '',
};

export default function RecyclersAdmin() {
  const [recyclers, setRecyclers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const { wasteTypes, loading: wasteTypesLoading } = useCityWasteTypes({ activeOnly: true });

  const fetchRecyclers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/recyclers');
      setRecyclers(res.data?.data?.recyclers || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecyclers(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = async (recycler) => {
    setEditingId(recycler.id);
    try {
      const res = await api.get(`/admin/recyclers/${recycler.id}`);
      const detail = res.data?.data?.recycler || recycler;
      setForm({
        ...initialForm,
        company_name: detail.company_name,
        contact_person: detail.contact_person,
        phone: detail.phone,
        email: detail.email || '',
        location: detail.location || '',
        waste_types_accepted: detail.waste_types_accepted || '',
        accepted_waste_type_ids: detail.accepted_waste_type_ids || [],
        buying_capacity_kg_week: detail.buying_capacity_kg_week || '',
        buying_capacity_kg_month: detail.buying_capacity_kg_month || '',
        status: detail.status,
        create_user_account: false,
      });
      setModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load recycler details');
    }
  };

  const toggleAcceptedType = (typeId) => {
    const id = Number(typeId);
    const current = new Set(form.accepted_waste_type_ids.map(Number));
    if (current.has(id)) current.delete(id);
    else current.add(id);
    setForm({ ...form, accepted_waste_type_ids: [...current] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.accepted_waste_type_ids.length === 0) {
      alert('Select at least one city waste type this recycler buys.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        accepted_waste_type_ids: form.accepted_waste_type_ids.map(Number),
      };
      if (editingId) {
        await api.patch(`/admin/recyclers/${editingId}`, payload);
      } else {
        await api.post('/admin/recyclers', payload);
      }
      setModalOpen(false);
      fetchRecyclers();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (recycler) => {
    const next = recycler.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await api.patch(`/admin/recyclers/${recycler.id}`, { status: next });
    fetchRecyclers();
  };

  if (loading) return <LoadingState message="Loading recyclers..." />;
  if (error) return <ErrorState error={error} onRetry={fetchRecyclers} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recycler Management</h1>
          <p className="text-sm text-[#6B7280]">Approve recyclers and link them to city waste types they purchase.</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="mr-1 inline" /> Add recycler</Button>
      </div>

      {recyclers.length === 0 ? (
        <EmptyState title="No recyclers yet" description="Add your first approved recycler." />
      ) : (
        <DataTable
          columns={['Company', 'Contact', 'Phone', 'Waste types', 'Status', 'Actions']}
        >
          {recyclers.map((recycler) => (
            <tr key={recycler.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
              <td className="px-4 py-3 font-medium">{recycler.company_name}</td>
              <td className="px-4 py-3">{recycler.contact_person}</td>
              <td className="px-4 py-3">{recycler.phone}</td>
              <td className="px-4 py-3">{recycler.waste_types_accepted || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={recycler.status} /></td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(recycler)} className="text-[#238636]">
                    <Edit2 size={16} />
                  </button>
                  <Button size="sm" variant="secondary" onClick={() => toggleStatus(recycler)}>
                    {recycler.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit recycler' : 'Add recycler'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {['company_name', 'contact_person', 'phone', 'email', 'location'].map((field) => (
            <div key={field}>
              <label className="text-sm capitalize">{field.replace(/_/g, ' ')}</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required={['company_name', 'contact_person', 'phone'].includes(field)}
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium">Accepted city waste types *</label>
            <p className="text-xs text-[#6B7280] mb-2">
              Recyclers only see published batches that match these types.
            </p>
            {wasteTypesLoading ? (
              <p className="text-sm text-[#6B7280]">Loading waste types...</p>
            ) : wasteTypes.length === 0 ? (
              <p className="text-sm text-amber-700">Create city waste types first under Waste Types.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                {wasteTypes.map((type) => (
                  <label key={type.id} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={form.accepted_waste_type_ids.map(Number).includes(Number(type.id))}
                      onChange={() => toggleAcceptedType(type.id)}
                    />
                    {type.name}
                    {type.reporting_category_name ? ` (${type.reporting_category_name})` : ''}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Weekly capacity (kg)</label>
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={form.buying_capacity_kg_week} onChange={(e) => setForm({ ...form, buying_capacity_kg_week: e.target.value })} />
            </div>
            <div>
              <label className="text-sm">Monthly capacity (kg)</label>
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={form.buying_capacity_kg_month} onChange={(e) => setForm({ ...form, buying_capacity_kg_month: e.target.value })} />
            </div>
          </div>
          {!editingId && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.create_user_account} onChange={(e) => setForm({ ...form, create_user_account: e.target.checked })} />
                Create login account
              </label>
              {form.create_user_account && (
                <>
                  <input className="w-full rounded-lg border px-3 py-2" placeholder="Login email" value={form.user_email} onChange={(e) => setForm({ ...form, user_email: e.target.value })} required />
                  <input type="password" className="w-full rounded-lg border px-3 py-2" placeholder="Password" value={form.user_password} onChange={(e) => setForm({ ...form, user_password: e.target.value })} required />
                </>
              )}
            </>
          )}
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
        </form>
      </Modal>
    </div>
  );
}

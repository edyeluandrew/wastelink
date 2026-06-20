import { useEffect, useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import api from '../api/axios';
import {
  Button, LoadingState, ErrorState, EmptyState, DataTable, Modal, StatusBadge,
} from '../components';

const initialForm = {
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  location: '',
  waste_types_accepted: '',
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

  const openEdit = (recycler) => {
    setEditingId(recycler.id);
    setForm({
      ...initialForm,
      company_name: recycler.company_name,
      contact_person: recycler.contact_person,
      phone: recycler.phone,
      email: recycler.email || '',
      location: recycler.location || '',
      waste_types_accepted: recycler.waste_types_accepted || '',
      buying_capacity_kg_week: recycler.buying_capacity_kg_week || '',
      buying_capacity_kg_month: recycler.buying_capacity_kg_month || '',
      status: recycler.status,
      create_user_account: false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/admin/recyclers/${editingId}`, form);
      } else {
        await api.post('/admin/recyclers', form);
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

  const columns = [
    { key: 'company_name', label: 'Company' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'waste_types_accepted', label: 'Waste types' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button type="button" onClick={() => openEdit(row)} className="text-[#238636]"><Edit2 size={16} /></button>
          <Button size="sm" variant="secondary" onClick={() => toggleStatus(row)}>
            {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recycler Management</h1>
          <p className="text-sm text-[#6B7280]">Approve and manage recovery buyers.</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="mr-1 inline" /> Add recycler</Button>
      </div>

      {recyclers.length === 0 ? (
        <EmptyState title="No recyclers yet" description="Add your first approved recycler." />
      ) : (
        <DataTable columns={columns} data={recyclers} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit recycler' : 'Add recycler'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {['company_name', 'contact_person', 'phone', 'email', 'location', 'waste_types_accepted'].map((field) => (
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

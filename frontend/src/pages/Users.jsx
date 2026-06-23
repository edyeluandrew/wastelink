import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, RotateCcw, Power, PowerOff, KeyRound } from 'lucide-react';
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
import { formatDateTime, formatStatus } from '../utils/formatters';
import { getAuthUser, normalizeRole } from '../utils/auth';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  CITY_ADMIN: 'City Admin',
  AGENT: 'Agent',
  PICKER: 'Picker',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
];

const DEFAULT_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'AGENT',
  city: '',
  division: '',
  collection_point_id: '',
  picker_id: '',
  status: 'ACTIVE',
};

const buildRoleFilterOptions = (actorRole) => {
  if (actorRole === 'CITY_ADMIN') {
    return [
      { value: '', label: 'All' },
      { value: 'AGENT', label: 'Agent' },
      { value: 'PICKER', label: 'Picker' },
    ];
  }

  return [
    { value: '', label: 'All' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'CITY_ADMIN', label: 'City Admin' },
    { value: 'AGENT', label: 'Agent' },
    { value: 'PICKER', label: 'Picker' },
  ];
};

const buildCreateRoleOptions = (actorRole, currentRole = '') => {
  const options = actorRole === 'CITY_ADMIN'
    ? ['AGENT', 'PICKER']
    : ['CITY_ADMIN', 'AGENT', 'PICKER'];

  if (currentRole === 'SUPER_ADMIN' && actorRole === 'SUPER_ADMIN') {
    return ['SUPER_ADMIN', ...options.filter((role) => role !== 'SUPER_ADMIN')];
  }

  return options;
};

const toNullableId = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export default function Users() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const actorRole = normalizeRole(authUser?.role);
  const actorCity = authUser?.city ? String(authUser.city).trim() : '';
  const isSuperAdmin = actorRole === 'SUPER_ADMIN';
  const isCityAdmin = actorRole === 'CITY_ADMIN';
  const isAdminUser = isSuperAdmin || isCityAdmin;

  const [users, setUsers] = useState([]);
  const [collectionPoints, setCollectionPoints] = useState([]);
  const [pickers, setPickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [filters, setFilters] = useState({ role: '', status: '', city: '' });
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const roleFilterOptions = useMemo(() => buildRoleFilterOptions(actorRole), [actorRole]);
  const createRoleOptions = useMemo(() => buildCreateRoleOptions(actorRole, form.role), [actorRole, form.role]);

  useEffect(() => {
    if (!isAdminUser) {
      navigate('/access-denied', { replace: true });
    }
  }, [isAdminUser, navigate]);

  const fetchUsers = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeFilters.role) params.set('role', activeFilters.role);
      if (activeFilters.status) params.set('status', activeFilters.status);
      if (isSuperAdmin && activeFilters.city) params.set('city', activeFilters.city);

      const response = await api.get(`/users${params.toString() ? `?${params.toString()}` : ''}`);
      setUsers(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      setReferenceLoading(true);
      const [collectionPointRes, pickerRes] = await Promise.all([
        api.get('/collection-points'),
        api.get('/pickers'),
      ]);
      setCollectionPoints(collectionPointRes.data.data || []);
      setPickers(pickerRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reference data');
    } finally {
      setReferenceLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchUsers(filters);
  }, [filters]);

  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) {
      return users;
    }

    return users.filter((user) => {
      const role = normalizeRole(user.role);
      if (!['AGENT', 'PICKER'].includes(role)) {
        return false;
      }

      if (!actorCity || !user.city) {
        return true;
      }

      return String(user.city).trim() === actorCity;
    });
  }, [actorCity, isSuperAdmin, users]);

  const cityOptions = useMemo(() => {
    const values = new Set();
    visibleUsers.forEach((user) => {
      if (user.city) values.add(user.city);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [visibleUsers]);

  const canManageUser = (user) => {
    if (isSuperAdmin) {
      return true;
    }

    const role = normalizeRole(user.role);
    if (!['AGENT', 'PICKER'].includes(role)) {
      return false;
    }

    if (!actorCity || !user.city) {
      return true;
    }

    return String(user.city).trim() === actorCity;
  };

  const openForbidden = () => {
    setError('You do not have permission to manage that user.');
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    const defaultRole = actorRole === 'CITY_ADMIN' ? 'AGENT' : 'CITY_ADMIN';
    setForm({
      ...DEFAULT_FORM,
      role: defaultRole,
      city: actorCity || '',
    });
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    if (!canManageUser(user)) {
      openForbidden();
      return;
    }

    setIsEditing(true);
    setSelectedUserId(user.id);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role || 'AGENT',
      city: user.city || '',
      division: user.division || '',
      collection_point_id: user.collection_point_id || '',
      picker_id: user.picker_id || '',
      status: user.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(DEFAULT_FORM);
    setSelectedUserId(null);
  };

  const closeResetModal = () => {
    setResetModalOpen(false);
    setResetForm({ password: '', confirmPassword: '' });
    setSelectedUserId(null);
  };

  const refreshUsers = async () => {
    await fetchUsers();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!form.role) {
      setError('Role is required');
      return;
    }

    const allowedRoles = buildCreateRoleOptions(actorRole, isEditing ? form.role : '');
    if (!allowedRoles.includes(form.role)) {
      setError('Forbidden');
      return;
    }

    if (!isEditing && !form.password) {
      setError('Password is required');
      return;
    }

    if (!form.email && !form.phone) {
      setError('Either email or phone is required');
      return;
    }

    if (form.role === 'AGENT' && !form.collection_point_id) {
      setError('AGENT users must be assigned to a collection point');
      return;
    }

    if (form.role === 'CITY_ADMIN' && !form.city.trim()) {
      setError('CITY_ADMIN users must have a city');
      return;
    }

    if (form.role === 'PICKER') {
      if (!form.picker_id) {
        setError('PICKER users must be linked to a picker profile');
        return;
      }

      if (!form.phone.trim()) {
        setError('PICKER users must provide a phone number');
        return;
      }

      const pickerExists = pickers.some((picker) => String(picker.id) === String(form.picker_id));
      if (!pickerExists) {
        setError('Selected picker profile was not found');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: form.role,
        city: form.city.trim() || (isCityAdmin ? actorCity || null : null),
        division: form.division.trim() || null,
        collection_point_id: toNullableId(form.collection_point_id),
        picker_id: toNullableId(form.picker_id),
        status: form.status,
      };

      if (!isEditing) {
        payload.password = form.password;
        await api.post('/users', payload);
      } else {
        await api.patch(`/users/${selectedUserId}`, payload);
      }

      closeModal();
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateToggle = async (user) => {
    if (!canManageUser(user)) {
      openForbidden();
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const endpoint = user.status === 'ACTIVE' ? `/users/${user.id}/deactivate` : `/users/${user.id}/activate`;
      await api.patch(endpoint);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setSubmitting(false);
    }
  };

  const openResetModal = (user) => {
    if (!canManageUser(user)) {
      openForbidden();
      return;
    }

    setSelectedUserId(user.id);
    setResetForm({ password: '', confirmPassword: '' });
    setResetModalOpen(true);
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!resetForm.password) {
      setError('Password is required');
      return;
    }

    if (resetForm.password !== resetForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setResetSubmitting(true);
      setError(null);
      await api.patch(`/users/${selectedUserId}/reset-password`, {
        password: resetForm.password,
      });
      closeResetModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  const assignableCollectionPoints = useMemo(() => {
    const takenPointIds = new Set(
      users
        .filter(
          (user) =>
            normalizeRole(user.role) === 'AGENT' &&
            user.status === 'ACTIVE' &&
            String(user.id) !== String(selectedUserId || '')
        )
        .map((user) => String(user.collection_point_id))
        .filter(Boolean)
    );

    return collectionPoints.filter((point) => {
      if (point.status !== 'ACTIVE') return false;
      if (String(point.id) === String(form.collection_point_id)) return true;
      return !takenPointIds.has(String(point.id));
    });
  }, [collectionPoints, users, selectedUserId, form.collection_point_id]);

  const isAgent = form.role === 'AGENT';
  const isPicker = form.role === 'PICKER';
  const isFormCityAdmin = form.role === 'CITY_ADMIN';
  const isFormSuperAdmin = form.role === 'SUPER_ADMIN';

  if (loading || referenceLoading) {
    return <LoadingState message="Loading users..." />;
  }

  if (error && users.length === 0) {
    return <ErrorState error={error} onRetry={refreshUsers} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-wastelink-dark">Users & Agents</h2>
          <p className="text-sm text-wastelink-muted mt-1">
            {isCityAdmin
              ? 'Manage Agents and Pickers for your city.'
              : 'Manage Super Admin, City Admin, Agent, and Picker accounts.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refreshUsers} variant="secondary" className="inline-flex items-center gap-2">
            <RotateCcw size={16} /> Refresh
          </Button>
          <Button onClick={openCreateModal} className="inline-flex items-center gap-2">
            <Plus size={16} /> Add User
          </Button>
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-wastelink-dark mb-2">Role</label>
          <select
            value={filters.role}
            onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
            className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          >
            {roleFilterOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-wastelink-dark mb-2">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {isSuperAdmin && (
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">City</label>
            <select
              value={filters.city}
              onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
              className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            >
              <option value="">All Cities</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {visibleUsers.length === 0 ? (
        <EmptyState message="No users found" subtext="Create the first account to get started" />
      ) : (
        <DataTable
          columns={[
            'Name',
            'Email',
            'Phone',
            'Role',
            'City',
            'Division',
            'Collection Point',
            'Picker',
            'Status',
            'Created At',
            'Actions',
          ]}
        >
          {visibleUsers.map((user) => (
            <tr key={user.id} className="border-b border-wastelink-border hover:bg-gray-50">
              <td className="table-cell font-medium text-wastelink-dark">{user.name}</td>
              <td className="table-cell text-sm">{user.email || '-'}</td>
              <td className="table-cell text-sm">{user.phone || '-'}</td>
              <td className="table-cell text-sm">{formatStatus(user.role)}</td>
              <td className="table-cell text-sm">{user.city || '-'}</td>
              <td className="table-cell text-sm">{user.division || '-'}</td>
              <td className="table-cell text-sm">{user.collection_point_name || '-'}</td>
              <td className="table-cell text-sm">{user.picker_name || '-'}</td>
              <td className="table-cell"><StatusBadge status={user.status} /></td>
              <td className="table-cell text-sm">{formatDateTime(user.created_at)}</td>
              <td className="table-cell">
                {canManageUser(user) ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="rounded-lg border border-wastelink-border p-2 text-wastelink-primary hover:bg-wastelink-success"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => openResetModal(user)}
                      className="rounded-lg border border-wastelink-border p-2 text-wastelink-primary hover:bg-wastelink-success"
                      title="Reset password"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      onClick={() => handleDeactivateToggle(user)}
                      className={`rounded-lg border p-2 ${user.status === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                      title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      disabled={submitting}
                    >
                      {user.status === 'ACTIVE' ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-wastelink-muted">Restricted</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit User' : 'Add User'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                placeholder="User name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              >
                {createRoleOptions.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                placeholder="0700000000"
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                placeholder="Temporary password"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">City {isFormCityAdmin ? '*' : ''}</label>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                placeholder="Mbarara"
                readOnly={isCityAdmin}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Division</label>
              <input
                value={form.division}
                onChange={(e) => setForm((prev) => ({ ...prev, division: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                placeholder="Division name"
              />
            </div>
          </div>

          {isAgent && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900">
                Every agent must be linked to a collection point. Create the point first under Collection Points, then assign it here.
              </p>
              <div className="mt-3">
                <label className="block text-sm font-medium text-wastelink-dark mb-2">Collection Point *</label>
                <select
                  value={form.collection_point_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, collection_point_id: e.target.value }))}
                  className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
                  required
                >
                  <option value="">Select collection point</option>
                  {assignableCollectionPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.point_code} — {point.name} ({point.division || 'No division'})
                    </option>
                  ))}
                </select>
                {assignableCollectionPoints.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No unassigned active collection points. Add one under Collection Points first.
                  </p>
                )}
              </div>
            </div>
          )}

          {isPicker && (
            <div>
              <label className="block text-sm font-medium text-wastelink-dark mb-2">Link Existing Picker Profile</label>
              <select
                value={form.picker_id}
                onChange={(e) => setForm((prev) => ({ ...prev, picker_id: e.target.value }))}
                className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
              >
                <option value="">No picker profile linked</option>
                {pickers.map((picker) => (
                  <option key={picker.id} value={picker.id}>
                    {picker.name} ({picker.picker_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isFormSuperAdmin && (
            <p className="text-xs text-wastelink-muted">Super Admin does not require a city, collection point, or picker link.</p>
          )}

          {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
            </Button>
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={resetModalOpen}
        onClose={closeResetModal}
        title="Reset Password"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">New Password</label>
            <input
              type="password"
              value={resetForm.password}
              onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-wastelink-dark mb-2">Confirm Password</label>
            <input
              type="password"
              value={resetForm.confirmPassword}
              onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full rounded-lg border border-wastelink-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wastelink-primary"
            />
          </div>
          {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={resetSubmitting} className="flex-1">
              {resetSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeResetModal} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

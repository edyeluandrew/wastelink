import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { LoadingState, ErrorState, StatusBadge } from '../../components';

export default function RecyclerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/recycler/profile');
        setProfile(res.data?.data?.profile || null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading profile..." />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  if (!profile) return <ErrorState error={{ message: 'Profile not found' }} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Recycler Profile</h1>
        <div className="mt-2"><StatusBadge status={profile.status} /></div>
      </div>

      <section className="rounded-3xl border border-[#D9D9D9] bg-white p-5 shadow-sm space-y-4">
        <div><p className="text-xs uppercase text-[#6B7280]">Company</p><p className="font-semibold">{profile.company_name}</p></div>
        <div><p className="text-xs uppercase text-[#6B7280]">Contact person</p><p className="font-semibold">{profile.contact_person}</p></div>
        <div><p className="text-xs uppercase text-[#6B7280]">Phone</p><p className="font-semibold">{profile.phone}</p></div>
        {profile.email && <div><p className="text-xs uppercase text-[#6B7280]">Email</p><p className="font-semibold">{profile.email}</p></div>}
        {profile.location && <div><p className="text-xs uppercase text-[#6B7280]">Location</p><p className="font-semibold">{profile.location}</p></div>}
        {profile.waste_types_accepted && <div><p className="text-xs uppercase text-[#6B7280]">Waste types accepted</p><p className="font-semibold">{profile.waste_types_accepted}</p></div>}
        {(profile.buying_capacity_kg_week || profile.buying_capacity_kg_month) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.buying_capacity_kg_week && (
              <div><p className="text-xs uppercase text-[#6B7280]">Weekly capacity</p><p className="font-semibold">{profile.buying_capacity_kg_week} kg</p></div>
            )}
            {profile.buying_capacity_kg_month && (
              <div><p className="text-xs uppercase text-[#6B7280]">Monthly capacity</p><p className="font-semibold">{profile.buying_capacity_kg_month} kg</p></div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { resolveAppCity } from '../utils/city';
import { getAuthUser } from '../utils/auth';

export function useCityDivisions({ activeOnly = true, usePublic = false, city: cityOverride } = {}) {
  const authUser = getAuthUser();
  const city = cityOverride || resolveAppCity(authUser);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDivisions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const path = usePublic ? '/divisions/public' : '/divisions';
      const params = { city };
      if (!usePublic && activeOnly) {
        params.active_only = true;
      }
      const res = await api.get(path, { params });
      const list = res.data.data?.divisions || [];
      setDivisions(list);
    } catch (err) {
      setError(err);
      setDivisions([]);
    } finally {
      setLoading(false);
    }
  }, [city, activeOnly, usePublic]);

  useEffect(() => {
    fetchDivisions();
  }, [fetchDivisions]);

  const divisionNames = divisions.map((d) => d.name);

  return {
    divisions,
    divisionNames,
    city,
    loading,
    error,
    refetch: fetchDivisions,
  };
}

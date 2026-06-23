import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { resolveAppCity } from '../utils/city';
import { getAuthUser } from '../utils/auth';

export function useCities({ activeOnly = true, pilotOnly = false, usePublic = true } = {}) {
  const authUser = getAuthUser();
  const [cities, setCities] = useState([]);
  const [defaultCity, setDefaultCity] = useState(resolveAppCity(authUser));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const path = usePublic ? '/cities/public' : '/cities';
      const params = {};
      if (pilotOnly) params.pilot_only = true;
      if (!usePublic && activeOnly) params.active_only = true;

      const res = await api.get(path, { params });
      const payload = res.data.data || {};
      const list = payload.cities || payload || [];
      setCities(list);
      if (payload.default_city) {
        setDefaultCity(payload.default_city);
      }
    } catch (err) {
      setError(err);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }, [activeOnly, pilotOnly, usePublic]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  return {
    cities,
    defaultCity,
    loading,
    error,
    refetch: fetchCities,
  };
}

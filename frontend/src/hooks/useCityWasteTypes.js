import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { resolveAppCity } from '../utils/city';
import { getAuthUser } from '../utils/auth';

export function useCityWasteTypes({ city: cityOverride, usePublic = false, activeOnly = true } = {}) {
  const authUser = getAuthUser();
  const city = cityOverride || resolveAppCity(authUser);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWasteTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (usePublic) {
        const res = await api.get('/city-waste-types/public', { params: { city } });
        setWasteTypes(res.data.data?.waste_types || []);
        return;
      }

      const path = activeOnly ? '/city-waste-types/active' : '/city-waste-types';
      const params = activeOnly ? { city } : {};
      if (!activeOnly && city) params.city = city;

      const res = await api.get(path, { params });
      setWasteTypes(res.data.data || []);
    } catch (err) {
      setError(err);
      setWasteTypes([]);
    } finally {
      setLoading(false);
    }
  }, [city, usePublic, activeOnly]);

  useEffect(() => {
    fetchWasteTypes();
  }, [fetchWasteTypes]);

  return {
    wasteTypes,
    city,
    loading,
    error,
    refetch: fetchWasteTypes,
  };
}

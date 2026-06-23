import { normalizeCity } from './cityScope.js';

export const DEFAULT_CITY = normalizeCity(process.env.DEFAULT_CITY || 'mbarara');

export const formatCityLabel = (city) =>
  String(city || DEFAULT_CITY)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const resolveAppCity = (authUser) => {
  if (authUser?.city) {
    return normalizeCity(authUser.city);
  }
  return DEFAULT_CITY;
};

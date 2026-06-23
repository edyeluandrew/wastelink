export const normalizeCity = (city) =>
  String(city || import.meta.env.VITE_DEFAULT_CITY || 'mbarara')
    .trim()
    .toLowerCase();

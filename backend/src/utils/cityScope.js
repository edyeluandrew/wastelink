export const normalizeCity = (city) =>
  String(city || process.env.DEFAULT_CITY || 'mbarara')
    .trim()
    .toLowerCase();

export const DEFAULT_CITY = normalizeCity(process.env.DEFAULT_CITY || 'mbarara');

export const formatCityLabel = (city) =>
  String(city || DEFAULT_CITY)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const resolveUserCity = (user) => normalizeCity(user?.city);

export const canManageCity = (user, city) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'CITY_ADMIN') {
    return resolveUserCity(user) === normalizeCity(city);
  }
  return false;
};

export const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'item';

export const normalizeCity = (city) =>
  String(city || process.env.DEFAULT_CITY || 'kampala')
    .trim()
    .toLowerCase();

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

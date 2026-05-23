const AUTH_TOKEN_KEY = 'wastelink_token';
const AUTH_USER_KEY = 'wastelink_user';

export const setAuthSession = (token, user) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const getAuthUser = () => {
  const value = localStorage.getItem(AUTH_USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

export const isAuthenticated = () => Boolean(getAuthToken());

export const getUserRole = () => getAuthUser()?.role || null;

export const getDefaultRouteForRole = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'CITY_ADMIN':
      return '/';
    case 'AGENT':
      return '/agent/dashboard';
    case 'PICKER':
      return '/picker/dashboard';
    default:
      return '/login';
  }
};
const AUTH_TOKEN_KEY = 'wastelink_token';
const AUTH_USER_KEY = 'wastelink_user';

export const setAuthSession = (token, user) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const normalizeRole = (role) => String(role || '').trim().toUpperCase();

export const getAuthUser = () => {
  const value = localStorage.getItem(AUTH_USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const isAuthenticatedRole = (role) => {
  const user = getAuthUser();
  return Boolean(user) && normalizeRole(user.role) === normalizeRole(role);
};

export const isAuthenticatedPicker = () => isAuthenticatedRole('PICKER');

export const isAuthenticatedAdmin = () => {
  const user = getAuthUser();
  return Boolean(user) && ['SUPER_ADMIN', 'CITY_ADMIN'].includes(normalizeRole(user.role));
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

// Remove all known session keys (auth + legacy picker/agent keys)
export const clearAllSessions = () => {
  try {
    // core auth
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    // picker legacy/session keys
    localStorage.removeItem('wastelink_picker_session');
    localStorage.removeItem('pickerSession');
    localStorage.removeItem('selectedPicker');
    localStorage.removeItem('selected_picker');
    localStorage.removeItem('wastelink_agent_collection_point');

    // agent legacy key
    localStorage.removeItem('agentCollectionPoint');

    return true;
  } catch (err) {
    return false;
  }
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
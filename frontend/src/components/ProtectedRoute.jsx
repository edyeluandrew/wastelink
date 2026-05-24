import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAuthToken, getAuthUser, isAuthenticatedRole } from '../utils/auth';
import { hasPickerSession } from '../picker/utils/pickerSession';
import { isAgentSessionActive } from '../agent/utils/agentSession';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

const hasLegacySession = (allowedRoles) => {
  if (!Array.isArray(allowedRoles)) {
    return false;
  }

  if (allowedRoles.includes('AGENT') && isAgentSessionActive()) {
    return true;
  }

  if (allowedRoles.includes('PICKER') && hasPickerSession()) {
    return true;
  }

  return false;
};

export default function ProtectedRoute({ allowedRoles, children, fallbackPath = '/login' }) {
  const location = useLocation();
  const token = getAuthToken();
  const user = getAuthUser();
  const pickerAuthAllowed = isAuthenticatedRole('PICKER');

  if (!token || !user) {
    if (AUTH_ENFORCED || !hasLegacySession(allowedRoles)) {
      return <Navigate to={fallbackPath} replace state={{ from: location.pathname }} />;
    }

    return children || <Outlet />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, role: user.role }} />;
  }

  if (AUTH_ENFORCED && Array.isArray(allowedRoles) && allowedRoles.includes('PICKER') && !pickerAuthAllowed) {
    return <Navigate to={fallbackPath} replace state={{ from: location.pathname }} />;
  }

  return children || <Outlet />;
}
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthUser, isAuthenticatedPicker } from '../../utils/auth';
import { hasPickerSession } from '../utils/pickerSession';

const AUTH_ENFORCED = import.meta.env.VITE_AUTH_ENFORCED !== 'false';

export default function PickerRouteRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const authUser = getAuthUser();
    const authPicker = isAuthenticatedPicker();

    if (AUTH_ENFORCED) {
      navigate(authPicker ? '/picker/dashboard' : '/login', { replace: true });
      return;
    }

    if (authPicker || hasPickerSession()) {
      navigate('/picker/dashboard', { replace: true });
      return;
    }

    navigate('/picker/start', { replace: true });
  }, [navigate]);

  return null;
}

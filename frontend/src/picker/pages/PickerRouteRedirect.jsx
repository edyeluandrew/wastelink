import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPickerSession } from '../utils/pickerSession';

export default function PickerRouteRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    if (hasPickerSession()) {
      navigate('/picker/dashboard');
    } else {
      navigate('/picker/start');
    }
  }, [navigate]);

  return null;
}

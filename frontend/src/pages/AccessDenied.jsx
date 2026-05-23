import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components';
import { getAuthUser, getDefaultRouteForRole } from '../utils/auth';

export default function AccessDenied() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const targetRoute = getDefaultRouteForRole(user?.role);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-3xl font-bold text-wastelink-dark">Access Denied</h1>
        <p className="mt-3 text-sm text-wastelink-muted">
          You do not have permission to view this page.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => navigate(targetRoute, { replace: true })} className="flex-1">
            Go to Dashboard
          </Button>
          <Button variant="secondary" onClick={() => navigate('/login', { replace: true })} className="flex-1">
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}
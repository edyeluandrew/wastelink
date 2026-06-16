import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Overview from './pages/Overview'
import Pickers from './pages/Pickers'
import Users from './pages/Users'
import CollectionPoints from './pages/CollectionPoints'
import WasteLogs from './pages/WasteLogs'
import Divisions from './pages/Divisions'
import Earnings from './pages/Earnings'
import Reports from './pages/Reports'
import Login from './pages/Login'
import AccessDenied from './pages/AccessDenied'
import AgentLayout from './agent/components/AgentLayout'
import SelectCollectionPoint from './agent/pages/SelectCollectionPoint'
import AgentDashboard from './agent/pages/AgentDashboard'
import PendingLogs from './agent/pages/PendingLogs'
import VerifyWaste from './agent/pages/VerifyWaste'
import AgentHistory from './agent/pages/AgentHistory'
import PickerLayout from './picker/components/PickerLayout'
import PickerRouteRedirect from './picker/pages/PickerRouteRedirect'
import PickerStart from './picker/pages/PickerStart'
import PickerRegister from './picker/pages/PickerRegister'
import PickerDashboard from './picker/pages/PickerDashboard'
import LogWaste from './picker/pages/LogWaste'
import MyJobs from './picker/pages/MyJobs'
import MyEarnings from './picker/pages/MyEarnings'
import PickerCollectionPoints from './picker/pages/PickerCollectionPoints'
import PickerHelp from './picker/pages/PickerHelp'
import ProtectedRoute from './components/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: 'login',
    element: <Login />,
  },
  {
    path: 'access-denied',
    element: <AccessDenied />,
  },
  {
    element: (
      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CITY_ADMIN']} fallbackPath="/login">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Overview /> },
      { path: 'overview', element: <Overview /> },
      { path: 'pickers', element: <Pickers /> },
      { path: 'collection-points', element: <CollectionPoints /> },
      { path: 'waste-logs', element: <WasteLogs /> },
      { path: 'divisions', element: <Divisions /> },
      { path: 'earnings', element: <Earnings /> },
      { path: 'reports', element: <Reports /> },
    ],
  },
  {
    element: (
      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CITY_ADMIN']} fallbackPath="/login">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'users', element: <Users /> },
    ],
  },
  {
    path: 'route-test',
    element: <div style={{padding: '40px', fontSize: '24px', color: '#238636'}}>✅ Route test works!</div>,
  },
  {
    path: 'agent/select-point',
    element: <SelectCollectionPoint />,
  },
  {
    path: 'agent',
    element: <ProtectedRoute allowedRoles={['AGENT']} fallbackPath="/agent/select-point"><AgentLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <AgentDashboard /> },
      { path: 'dashboard', element: <AgentDashboard /> },
      { path: 'pending', element: <PendingLogs /> },
      { path: 'verify', element: <VerifyWaste /> },
      { path: 'history', element: <AgentHistory /> },
    ],
  },
  {
    path: 'picker/start',
    element: <PickerStart />,
  },
  {
    path: 'picker/register',
    element: <PickerRegister />,
  },
  {
    path: 'picker',
    element: <ProtectedRoute allowedRoles={['PICKER']} fallbackPath="/login"><PickerLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <PickerRouteRedirect /> },
      { path: 'dashboard', element: <PickerDashboard /> },
      { path: 'log-waste', element: <LogWaste /> },
      { path: 'jobs', element: <MyJobs /> },
      { path: 'earnings', element: <MyEarnings /> },
      { path: 'collection-points', element: <PickerCollectionPoints /> },
      { path: 'help', element: <PickerHelp /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />,
)

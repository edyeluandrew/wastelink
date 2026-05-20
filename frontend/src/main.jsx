import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Overview from './pages/Overview'
import Pickers from './pages/Pickers'
import CollectionPoints from './pages/CollectionPoints'
import WasteLogs from './pages/WasteLogs'
import Divisions from './pages/Divisions'
import Earnings from './pages/Earnings'
import Reports from './pages/Reports'
import AgentLayout from './agent/components/AgentLayout'
import SelectCollectionPoint from './agent/pages/SelectCollectionPoint'
import AgentDashboard from './agent/pages/AgentDashboard'
import PendingLogs from './agent/pages/PendingLogs'
import VerifyWaste from './agent/pages/VerifyWaste'
import AgentHistory from './agent/pages/AgentHistory'

const router = createBrowserRouter([
  {
    element: <DashboardLayout />,
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
    path: 'route-test',
    element: <div style={{padding: '40px', fontSize: '24px', color: '#238636'}}>✅ Route test works!</div>,
  },
  {
    path: 'agent',
    element: <AgentLayout />,
    children: [
      { index: true, element: <AgentDashboard /> },
      { path: 'select-point', element: <SelectCollectionPoint /> },
      { path: 'dashboard', element: <AgentDashboard /> },
      { path: 'pending', element: <PendingLogs /> },
      { path: 'verify', element: <VerifyWaste /> },
      { path: 'history', element: <AgentHistory /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />,
)

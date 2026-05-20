import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Overview';
import Pickers from './pages/Pickers';
import CollectionPoints from './pages/CollectionPoints';
import WasteLogs from './pages/WasteLogs';
import Divisions from './pages/Divisions';
import Earnings from './pages/Earnings';
import Reports from './pages/Reports';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout><Overview /></DashboardLayout>} />
        <Route path="/pickers" element={<DashboardLayout><Pickers /></DashboardLayout>} />
        <Route path="/collection-points" element={<DashboardLayout><CollectionPoints /></DashboardLayout>} />
        <Route path="/waste-logs" element={<DashboardLayout><WasteLogs /></DashboardLayout>} />
        <Route path="/divisions" element={<DashboardLayout><Divisions /></DashboardLayout>} />
        <Route path="/earnings" element={<DashboardLayout><Earnings /></DashboardLayout>} />
        <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
      </Routes>
    </Router>
  );
}

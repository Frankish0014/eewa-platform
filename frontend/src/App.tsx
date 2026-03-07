import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Projects from './pages/Projects';
import AdminOpportunities from './pages/AdminOpportunities';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLog from './pages/AdminAuditLog';
import AdminVentures from './pages/AdminVentures';
import ProviderOpportunities from './pages/ProviderOpportunities';
import ProviderEntrepreneurs from './pages/ProviderEntrepreneurs';
import Opportunities from './pages/Opportunities';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="projects" element={<Projects />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="admin/opportunities" element={<AdminOpportunities />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/ventures" element={<AdminVentures />} />
        <Route path="admin/audit" element={<AdminAuditLog />} />
        <Route path="provider/opportunities" element={<ProviderOpportunities />} />
        <Route path="provider/entrepreneurs" element={<ProviderEntrepreneurs />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

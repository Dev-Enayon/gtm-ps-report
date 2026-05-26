import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import AllReports from './pages/AllReports';
import ReportDetail from './pages/ReportDetail';
import Analytics from './pages/Analytics';
import ActivityLog from './pages/ActivityLog';
import UserManagement from './pages/UserManagement';
import AdminRequests from './pages/AdminRequests';
import MyReports from './pages/MyReports';
import ReportForm from './pages/ReportForm';
import RequestAdminPage from './pages/RequestAdminPage';

function PrivateRoute({ children, adminOnly = false, headAdminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#888'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (headAdminOnly && user.role !== 'head_admin') return <Navigate to="/dashboard" replace />;
  if (adminOnly && !['admin','head_admin'].includes(user.role)) return <Navigate to="/my-reports" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={['admin','head_admin'].includes(user.role) ? '/dashboard' : '/my-reports'} />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/my-reports" />} />
      <Route path="/" element={<DashboardLayout />}>
        {/* Admin routes */}
        <Route path="dashboard" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
        <Route path="admin/reports" element={<PrivateRoute adminOnly><AllReports /></PrivateRoute>} />
        <Route path="admin/reports/:id" element={<PrivateRoute adminOnly><ReportDetail /></PrivateRoute>} />
        <Route path="analytics" element={<PrivateRoute adminOnly><Analytics /></PrivateRoute>} />
        <Route path="activity" element={<PrivateRoute adminOnly><ActivityLog /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute adminOnly><UserManagement /></PrivateRoute>} />
        <Route path="admin/requests" element={<PrivateRoute headAdminOnly><AdminRequests /></PrivateRoute>} />
        {/* Branch user routes */}
        <Route path="my-reports" element={<PrivateRoute><MyReports /></PrivateRoute>} />
        <Route path="my-reports/new" element={<PrivateRoute><ReportForm /></PrivateRoute>} />
        <Route path="my-reports/:id/edit" element={<PrivateRoute><ReportForm /></PrivateRoute>} />
        <Route path="request-admin" element={<PrivateRoute><RequestAdminPage /></PrivateRoute>} />
        {/* Default redirects */}
        <Route index element={<Navigate to={user && ['admin','head_admin'].includes(user.role) ? '/dashboard' : '/my-reports'} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}

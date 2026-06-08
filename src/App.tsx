import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OwnerDashboard } from './pages/owner/Dashboard';
import { Expenses } from './pages/owner/Expenses';
import { Barbers } from './pages/owner/Barbers';
import { Salons } from './pages/owner/Salons';
import { BarberServiceLog } from './pages/barber/ServiceLog';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import type { User } from './store/authStore';

// ── Protected route guard ─────────────────────────────────────
const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: 'OWNER' | 'BARBER' | 'ADMIN';
}) => {
  const user = useAuthStore(state => state.user);

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return <Navigate to={getHomeForRole(user)} replace />;
  }

  return <>{children}</>;
};

const getHomeForRole = (user: User) => {
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'OWNER') return '/dashboard';
  return '/barber-dashboard';
};

// ── Root redirect ─────────────────────────────────────────────
const RootRedirect = () => {
  const user = useAuthStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeForRole(user)} replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Owner routes */}
          <Route path="/dashboard" element={<ProtectedRoute role="OWNER"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/salons"    element={<ProtectedRoute role="OWNER"><Salons /></ProtectedRoute>} />
          <Route path="/expenses"  element={<ProtectedRoute role="OWNER"><Expenses /></ProtectedRoute>} />
          <Route path="/barbers"   element={<ProtectedRoute role="OWNER"><Barbers /></ProtectedRoute>} />

          {/* Barber routes */}
          <Route path="/barber-dashboard" element={<ProtectedRoute role="BARBER"><BarberServiceLog /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              borderRadius: '10px',
              fontSize: '14px',
              padding: '12px 16px',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f9fafb' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

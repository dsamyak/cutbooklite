import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { OwnerDashboard } from './pages/owner/Dashboard';
import { Expenses } from './pages/owner/Expenses';
import { Barbers } from './pages/owner/Barbers';
import { BarberServiceLog } from './pages/barber/ServiceLog';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: 'OWNER' | 'BARBER' }) => {
  const user = useAuthStore(state => state.user);
  
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'OWNER' ? '/dashboard' : '/barber-dashboard'} replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Owner Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="OWNER">
            <OwnerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/expenses" element={
          <ProtectedRoute role="OWNER">
            <Expenses />
          </ProtectedRoute>
        } />
        <Route path="/barbers" element={
          <ProtectedRoute role="OWNER">
            <Barbers />
          </ProtectedRoute>
        } />
        
        {/* Barber Routes */}
        <Route path="/barber-dashboard" element={
          <ProtectedRoute role="BARBER">
            <BarberServiceLog />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

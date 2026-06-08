import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home } from 'lucide-react';

export const NotFound = () => {
  const user = useAuthStore(state => state.user);
  const home = !user
    ? '/login'
    : user.role === 'ADMIN'
    ? '/admin'
    : user.role === 'OWNER'
    ? '/dashboard'
    : '/barber-dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <p className="text-8xl font-extrabold text-blue-600 mb-2 leading-none">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-7">
          The page you're looking for doesn't exist or was moved.
        </p>
        <Link to={home} className="btn-primary inline-flex">
          <Home className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
};

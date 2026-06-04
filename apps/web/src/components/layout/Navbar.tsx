import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LogOut, Scissors, User } from 'lucide-react';

export const Navbar = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-blue-600 p-2 rounded-md">
                  <Scissors className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900 tracking-tight">CutBook</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                {user?.name} <span className="ml-2 text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LogOut, Scissors, LayoutDashboard, Receipt,
  Users, Store, Menu, X, Shield, User
} from 'lucide-react';

const ownerLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/salons', label: 'Salons', icon: Store },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/barbers', label: 'Barbers', icon: Users },
];

const barberLinks = [
  { to: '/barber-dashboard', label: 'Log Service', icon: Scissors },
];

const adminLinks = [
  { to: '/admin', label: 'Admin Panel', icon: Shield },
];

const roleBadgeClass = (role: string) => {
  if (role === 'ADMIN') return 'bg-purple-100 text-purple-700';
  if (role === 'OWNER') return 'bg-blue-100 text-blue-700';
  return 'bg-emerald-100 text-emerald-700';
};

export const Navbar = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links =
    user?.role === 'ADMIN' ? adminLinks
    : user?.role === 'OWNER' ? ownerLinks
    : barberLinks;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-50 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">

            {/* Left: Logo + Desktop nav */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-sm">
                  <Scissors className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">CutBook</span>
              </div>

              {/* Desktop links */}
              <div className="hidden md:flex items-center gap-1">
                {links.map(link => (
                  <NavLink key={link.to} to={link.to} className={navLinkClass}>
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Right: User info + Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 max-w-[110px] truncate">
                  {user?.name}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleBadgeClass(user?.role || '')}`}>
                  {user?.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1 bg-white animate-in">
            {/* User info on mobile */}
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-auto ${roleBadgeClass(user?.role || '')}`}>
                {user?.role}
              </span>
            </div>
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

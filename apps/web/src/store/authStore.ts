import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'BARBER';
  ownerId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));

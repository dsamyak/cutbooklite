import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'BARBER' | 'ADMIN';
  ownerId: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  setAuth: (user: User | null, session: Session | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,

  setAuth: (user, session) => {
    set({ user, session });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));

// Listen to Supabase auth changes to sync with Zustand
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    const { user_metadata } = session.user;
    useAuthStore.getState().setAuth({
      id: session.user.id,
      email: session.user.email || '',
      name: user_metadata?.name || session.user.email?.split('@')[0] || 'User',
      role: user_metadata?.role || 'OWNER',
      ownerId: user_metadata?.ownerId || session.user.id,
    }, session);
  } else {
    useAuthStore.getState().setAuth(null, null);
  }
});

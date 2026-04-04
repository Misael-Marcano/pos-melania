import { create } from 'zustand';
import { AuthUser } from '@pos/shared';
import { authService } from '@/services/auth.service';

interface AuthStore {
  user:   AuthUser | null;
  loaded: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:   null,
  loaded: false,

  loadFromStorage: () => {
    if (typeof window === 'undefined') { set({ loaded: true }); return; }
    const raw = localStorage.getItem('pos_user');
    const token = localStorage.getItem('pos_token');
    if (raw && token) {
      try {
        set({ user: JSON.parse(raw), loaded: true });
      } catch {
        set({ loaded: true });
      }
    } else {
      set({ loaded: true });
    }
  },

  login: async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('pos_token',         res.accessToken);
    localStorage.setItem('pos_refresh_token', res.refreshToken);
    localStorage.setItem('pos_user',          JSON.stringify(res.user));
    set({ user: res.user });
  },

  logout: async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_refresh_token');
    localStorage.removeItem('pos_user');
    set({ user: null });
  },
}));

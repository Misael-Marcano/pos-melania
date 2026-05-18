import { create } from 'zustand';
import { AuthUser } from '@pos/shared';
import { authService } from '@/services/auth.service';

const PLATFORM_TENANT_KEY = 'pos_platform_tenant_id';

function readPlatformTenantId(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PLATFORM_TENANT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

interface AuthStore {
  user:   AuthUser | null;
  loaded: boolean;
  /** Organización efectiva para rol `plataforma` (cabecera X-Tenant-Id). */
  platformTenantId: number | null;
  login:  (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
  setPlatformTenantId: (id: number) => void;
  clearPlatformTenantId: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:   null,
  loaded: false,
  platformTenantId: null,

  loadFromStorage: () => {
    if (typeof window === 'undefined') { set({ loaded: true }); return; }
    const raw = localStorage.getItem('pos_user');
    const token = localStorage.getItem('pos_token');
    const ptid = readPlatformTenantId();
    if (raw && token) {
      try {
        const user = JSON.parse(raw) as AuthUser;
        set({
          user,
          platformTenantId: user.rol === 'plataforma' ? ptid : null,
          loaded: true,
        });
      } catch {
        set({ loaded: true });
      }
    } else {
      set({ loaded: true });
    }
  },

  setPlatformTenantId: (id: number) => {
    localStorage.setItem(PLATFORM_TENANT_KEY, String(id));
    set({ platformTenantId: id });
  },

  clearPlatformTenantId: () => {
    localStorage.removeItem(PLATFORM_TENANT_KEY);
    set({ platformTenantId: null });
  },

  login: async (email, password, tenantSlug) => {
    const res = await authService.login(email, password, tenantSlug);
    localStorage.setItem('pos_token',         res.accessToken);
    localStorage.setItem('pos_refresh_token', res.refreshToken);
    localStorage.setItem('pos_user',          JSON.stringify(res.user));
    let platformTenantId: number | null = null;
    if (res.user.rol === 'plataforma') {
      const prev = readPlatformTenantId();
      platformTenantId = prev;
      if (prev == null) {
        localStorage.removeItem(PLATFORM_TENANT_KEY);
      }
    } else {
      localStorage.removeItem(PLATFORM_TENANT_KEY);
    }
    set({ user: res.user, platformTenantId });
  },

  logout: async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_refresh_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem(PLATFORM_TENANT_KEY);
    set({ user: null, platformTenantId: null });
  },
}));

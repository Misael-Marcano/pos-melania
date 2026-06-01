'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { clearClientAuthStorage, isStaticSite } from '@/lib/site-mode';
import {
  isStaticDemoSession,
  STATIC_DEMO_USER,
} from '@/lib/static-demo';

/**
 * Carga el usuario desde localStorage al montar la app.
 * Usar en el layout raíz del dashboard.
 */
export function useAuth() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const user            = useAuthStore((s) => s.user);
  const loaded          = useAuthStore((s) => s.loaded);

  useEffect(() => {
    if (isStaticSite) {
      if (isStaticDemoSession()) {
        useAuthStore.setState({
          user:             STATIC_DEMO_USER,
          loaded:           true,
          platformTenantId: null,
        });
        return;
      }
      clearClientAuthStorage();
      useAuthStore.setState({ user: null, loaded: true, platformTenantId: null });
      return;
    }
    loadFromStorage();
  }, [loadFromStorage]);

  return { user, loaded };
}

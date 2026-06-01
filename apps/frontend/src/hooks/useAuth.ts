'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { clearClientAuthStorage, isStaticSite } from '@/lib/site-mode';
import {
  applyStaticDemoAuth,
  clearStaticDemoAuth,
  isStaticDemoSession,
} from '@/lib/static-demo';

/**
 * Carga el usuario desde localStorage al montar la app.
 * Usar en el layout raíz del dashboard.
 */
export function useAuth() {
  const pathname = usePathname();
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const user            = useAuthStore((s) => s.user);
  const loaded          = useAuthStore((s) => s.loaded);

  useEffect(() => {
    if (isStaticSite) {
      if (isStaticDemoSession()) {
        applyStaticDemoAuth();
        return;
      }
      clearClientAuthStorage();
      clearStaticDemoAuth();
      return;
    }
    loadFromStorage();
  }, [loadFromStorage, pathname]);

  return { user, loaded };
}

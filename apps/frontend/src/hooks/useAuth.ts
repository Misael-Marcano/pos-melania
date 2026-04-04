'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Carga el usuario desde localStorage al montar la app.
 * Usar en el layout raíz del dashboard.
 */
export function useAuth() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const user            = useAuthStore((s) => s.user);
  const loaded          = useAuthStore((s) => s.loaded);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return { user, loaded };
}

import { useQuery } from '@tanstack/react-query';
import { getSaasContext } from '@/services/saas.service';
import { useAuthStore } from '@/store/auth.store';
import { isStaticDemoActive, mockSaasContext } from '@/lib/static-demo';

export const SAAS_CONTEXT_KEY = 'saas-context';

/**
 * Plan y límites de la organización efectiva (JWT + `X-Tenant-Id` para rol plataforma).
 */
export function useSaasContext() {
  const user = useAuthStore((s) => s.user);
  const platformTenantId = useAuthStore((s) => s.platformTenantId);

  const orgKey =
    user?.rol === 'plataforma'
      ? platformTenantId ?? 'pending'
      : (user?.tenantId ?? 1);

  const demo = isStaticDemoActive();

  return useQuery({
    queryKey: [SAAS_CONTEXT_KEY, user?.id, orgKey, demo ? 'demo' : 'live'],
    queryFn:  () => (demo ? Promise.resolve(mockSaasContext()) : getSaasContext()),
    enabled:  !!user && (demo || user.rol !== 'plataforma' || platformTenantId != null),
    staleTime: demo ? Infinity : 5 * 60 * 1000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { tenantsService } from '@/services/tenants.service';
import { useAuthStore } from '@/store/auth.store';

export const TENANTS_PANEL_KEY = 'tenants-panel';

export function useTenantsPanel() {
  const user = useAuthStore((s) => s.user);
  const enabled = user?.rol === 'plataforma';

  return useQuery({
    queryKey: [TENANTS_PANEL_KEY],
    queryFn:  tenantsService.panel,
    enabled,
    staleTime: 60 * 1000,
  });
}

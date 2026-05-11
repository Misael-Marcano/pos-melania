import { useMutation, useQuery } from '@tanstack/react-query';
import * as billing from '@/services/billing.service';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';

export const BILLING_STATUS_KEY = 'billing-status';

export function useBillingStatus() {
  const user = useAuthStore((s) => s.user);
  const platformTenantId = useAuthStore((s) => s.platformTenantId);

  const orgKey =
    user?.rol === 'plataforma'
      ? platformTenantId ?? 'pending'
      : (user?.tenantId ?? 1);

  const can =
    user &&
    ['admin', 'soporte', 'plataforma'].includes(user.rol);

  const enabled =
    !!can &&
    (user!.rol !== 'plataforma' || platformTenantId != null);

  return useQuery({
    queryKey: [BILLING_STATUS_KEY, user?.id, orgKey],
    queryFn: billing.getBillingStatus,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useBillingMutations() {
  const checkout = useMutation({
    mutationFn: billing.createCheckoutSession,
    onSuccess: (d) => {
      if (d.url) window.location.href = d.url;
    },
    onError: (e: Error) => {
      toast.error(e instanceof Error ? e.message : 'No se pudo iniciar el pago');
    },
  });

  const portal = useMutation({
    mutationFn: billing.createPortalSession,
    onSuccess: (d) => {
      if (d.url) window.location.href = d.url;
    },
    onError: (e: Error) => {
      toast.error(e instanceof Error ? e.message : 'No se pudo abrir el portal');
    },
  });

  return { checkout, portal };
}

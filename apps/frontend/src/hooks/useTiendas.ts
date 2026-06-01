import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tiendasService, TiendaPayload } from '@/services/tiendas.service';
import { SAAS_CONTEXT_KEY } from '@/hooks/useSaasContext';
import { isStaticDemoActive, MOCK_TIENDAS } from '@/lib/static-demo';

export const TIENDAS_KEY = 'tiendas';

export function useTiendas() {
  const demo = isStaticDemoActive();
  return useQuery({
    queryKey: [TIENDAS_KEY, demo ? 'demo' : 'live'],
    queryFn:  () =>
      demo ? Promise.resolve([...MOCK_TIENDAS]) : tiendasService.getAll(),
    staleTime: demo ? Infinity : undefined,
  });
}

export function useCrearTienda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TiendaPayload) => tiendasService.create(payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: [TIENDAS_KEY] });
      qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
    },
  });
}

export function useActualizarTienda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TiendaPayload> }) =>
      tiendasService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TIENDAS_KEY] });
      qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
    },
  });
}

export function useEliminarTienda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tiendasService.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: [TIENDAS_KEY] });
      qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
    },
  });
}

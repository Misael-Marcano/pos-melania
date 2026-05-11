import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cajasService, CajaPayload } from '@/services/cajas.service';
import { CONFIG_KEY } from '@/hooks/useConfiguracion';

export const CAJAS_KEY = 'cajas';

export function useCajas(tiendaId?: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [CAJAS_KEY, tiendaId],
    queryFn:  () => cajasService.getAll(tiendaId),
    enabled:  options?.enabled ?? true,
  });
}

export function useCrearCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CajaPayload) => cajasService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAJAS_KEY] });
      qc.invalidateQueries({ queryKey: [CONFIG_KEY] });
    },
  });
}

export function useActualizarCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof cajasService.update>[1] }) =>
      cajasService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAJAS_KEY] });
      qc.invalidateQueries({ queryKey: [CONFIG_KEY] });
    },
  });
}

export function useEliminarCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cajasService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAJAS_KEY] });
      qc.invalidateQueries({ queryKey: [CONFIG_KEY] });
    },
  });
}

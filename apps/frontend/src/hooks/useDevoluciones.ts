import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devolucionesService, CreateDevolucionPayload } from '@/services/devoluciones.service';

export const DEVOLUCIONES_KEY = 'devoluciones';

export function useDevoluciones(estado?: string) {
  return useQuery({
    queryKey: [DEVOLUCIONES_KEY, estado],
    queryFn:  () => devolucionesService.getAll(estado),
  });
}

export function useDevolucionesByVenta(ventaId: number) {
  return useQuery({
    queryKey: [DEVOLUCIONES_KEY, 'venta', ventaId],
    queryFn:  () => devolucionesService.getByVenta(ventaId),
    enabled:  !!ventaId,
  });
}

export function useCrearDevolucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDevolucionPayload) => devolucionesService.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [DEVOLUCIONES_KEY] }),
  });
}

export function useAprobarDevolucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => devolucionesService.aprobar(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: [DEVOLUCIONES_KEY] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
    },
  });
}

export function useRechazarDevolucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      devolucionesService.rechazar(id, motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEVOLUCIONES_KEY] }),
  });
}

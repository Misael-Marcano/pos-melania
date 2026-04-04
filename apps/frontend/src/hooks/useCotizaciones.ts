import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cotizacionesService,
  CreateCotizacionPayload,
  UpdateCotizacionPayload,
  CambiarEstadoPayload,
} from '@/services/cotizaciones.service';
import { toast } from '@/store/toast.store';

const KEY = 'cotizaciones';

export function useCotizaciones(page = 1, limit = 20, estado = '') {
  return useQuery({
    queryKey:        [KEY, page, limit, estado],
    queryFn:         () => cotizacionesService.getAll(page, limit, estado),
    placeholderData: (prev) => prev,
  });
}

export function useCotizacion(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn:  () => cotizacionesService.getById(id),
    enabled:  !!id,
  });
}

export function useCrearCotizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCotizacionPayload) => cotizacionesService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Cotización creada exitosamente');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear cotización'),
  });
}

export function useActualizarCotizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCotizacionPayload }) =>
      cotizacionesService.update(id, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, v.id] });
      toast.success('Cotización actualizada');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al actualizar cotización'),
  });
}

export function useCambiarEstadoCotizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CambiarEstadoPayload }) =>
      cotizacionesService.cambiarEstado(id, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, v.id] });
      toast.success(`Estado cambiado a ${v.payload.estado}`);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al cambiar estado'),
  });
}

export function useConvertirAVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cotizacionesService.convertirAVenta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Cotización convertida a venta exitosamente');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al convertir a venta'),
  });
}

export function useEliminarCotizacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cotizacionesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success('Cotización eliminada');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al eliminar cotización'),
  });
}

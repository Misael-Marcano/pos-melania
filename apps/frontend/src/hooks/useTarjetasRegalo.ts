import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tarjetasRegaloService,
  CreateTarjetaPayload, RecargarPayload, UsarPayload, EstadoTarjeta,
} from '@/services/tarjetas-regalo.service';

const KEY = 'tarjetas-regalo';

export function useTarjetasRegalo(page = 1, limit = 20, q = '', estado = '') {
  return useQuery({
    queryKey: [KEY, page, limit, q, estado],
    queryFn:  () => tarjetasRegaloService.getAll(page, limit, q, estado),
    placeholderData: (prev) => prev,
  });
}

export function useTarjetaByCodigo(codigo: string) {
  return useQuery({
    queryKey: [KEY, 'codigo', codigo],
    queryFn:  () => tarjetasRegaloService.getByCodigo(codigo),
    enabled:  codigo.length >= 4,
    retry:    false,
  });
}

export function useCrearTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTarjetaPayload) => tarjetasRegaloService.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useRecargarTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RecargarPayload }) =>
      tarjetasRegaloService.recargar(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUsarTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UsarPayload }) =>
      tarjetasRegaloService.usar(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useActualizarTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateTarjetaPayload> & { estado?: EstadoTarjeta } }) =>
      tarjetasRegaloService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useEliminarTarjeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tarjetasRegaloService.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

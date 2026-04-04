import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comprasService, CreateOrdenPayload, RecepcionInput } from '@/services/compras.service';

export const COMPRAS_KEY = 'compras';

export function useCompras(estado?: string) {
  return useQuery({
    queryKey: [COMPRAS_KEY, estado],
    queryFn:  () => comprasService.getAll(estado),
  });
}

export function useOrdenCompra(id: number) {
  return useQuery({
    queryKey: [COMPRAS_KEY, id],
    queryFn:  () => comprasService.getById(id),
    enabled:  !!id,
  });
}

export function useCrearOrden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrdenPayload) => comprasService.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [COMPRAS_KEY] }),
  });
}

export function useActualizarOrden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateOrdenPayload> }) =>
      comprasService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPRAS_KEY] }),
  });
}

export function useEnviarOrden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => comprasService.enviar(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [COMPRAS_KEY] }),
  });
}

export function useRecibirOrden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recepciones }: { id: number; recepciones: RecepcionInput[] }) =>
      comprasService.recibir(id, recepciones),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPRAS_KEY] }),
  });
}

export function useCancelarOrden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => comprasService.cancelar(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [COMPRAS_KEY] }),
  });
}

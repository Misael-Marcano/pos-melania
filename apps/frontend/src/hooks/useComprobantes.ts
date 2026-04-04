import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comprobantesService, CreateComprobantePayload } from '@/services/comprobantes.service';

export const COMPROBANTES_KEY = 'comprobantes';

export function useComprobantes() {
  return useQuery({
    queryKey: [COMPROBANTES_KEY],
    queryFn:  comprobantesService.getAll,
  });
}

export function useCrearComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateComprobantePayload) => comprobantesService.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [COMPROBANTES_KEY] }),
  });
}

export function useActualizarComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateComprobantePayload> }) =>
      comprobantesService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPROBANTES_KEY] }),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promocionesService, IPromocion } from '@/services/promociones.service';
import { toast } from '@/store/toast.store';

const KEY = 'promociones';

export function usePromociones(q?: string) {
  return useQuery({
    queryKey: [KEY, q],
    queryFn:  () => promocionesService.getAll(q),
  });
}

export function useCrearPromocion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<IPromocion>) => promocionesService.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Promoción creada'); },
  });
}

export function useActualizarPromocion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<IPromocion> }) =>
      promocionesService.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Promoción actualizada'); },
  });
}

export function useEliminarPromocion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => promocionesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Promoción desactivada'); },
  });
}

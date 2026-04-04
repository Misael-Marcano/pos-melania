import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kitsService, KitPayload } from '@/services/kits.service';

export const KITS_KEY = 'kits';

export function useKits() {
  return useQuery({
    queryKey: [KITS_KEY],
    queryFn:  kitsService.getAll,
  });
}

export function useCrearKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: KitPayload) => kitsService.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KITS_KEY] }),
  });
}

export function useActualizarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<KitPayload> }) =>
      kitsService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KITS_KEY] }),
  });
}

export function useEliminarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => kitsService.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KITS_KEY] }),
  });
}

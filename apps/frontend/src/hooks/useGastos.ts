import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gastosService, CreateGastoPayload } from '@/services/gastos.service';
import { toast } from '@/store/toast.store';

export const GASTOS_KEY = 'gastos';

export function useGastos(page = 1, limit = 20, q = '') {
  return useQuery({
    queryKey: [GASTOS_KEY, page, limit, q],
    queryFn:  () => gastosService.getAll(page, limit, q),
    placeholderData: (prev) => prev,
  });
}

export function useCrearGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGastoPayload) => gastosService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GASTOS_KEY] });
      toast.success('Gasto registrado correctamente');
    },
  });
}

export function useActualizarGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateGastoPayload> }) =>
      gastosService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GASTOS_KEY] });
      toast.success('Gasto actualizado');
    },
  });
}

export function useEliminarGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gastosService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GASTOS_KEY] });
      toast.success('Gasto eliminado');
    },
  });
}

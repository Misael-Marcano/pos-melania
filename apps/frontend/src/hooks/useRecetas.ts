import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  recetasService,
  CreateRecetaPayload,
  UpdateRecetaPayload,
} from '@/services/recetas.service';
import { toast } from '@/store/toast.store';
import { uiLabels } from '@/lib/ui-labels';

const KEY = 'recetas';

export function useRecetas() {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => recetasService.getAll(),
  });
}

export function useReceta(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn:  () => recetasService.getById(id),
    enabled:  !!id,
  });
}

export function useCrearReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecetaPayload) => recetasService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(`${uiLabels.receta} creada`);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al crear'),
  });
}

export function useActualizarReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRecetaPayload }) =>
      recetasService.update(id, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, v.id] });
      toast.success(`${uiLabels.receta} actualizada`);
    },
    onError: (e: Error) => toast.error(e.message || 'Error al actualizar'),
  });
}

export function useEliminarReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => recetasService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(`${uiLabels.receta} desactivada`);
    },
    onError: (e: Error) => toast.error(e.message || 'Error'),
  });
}

export function useProducirReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lotes }: { id: number; lotes: number }) =>
      recetasService.producir(id, lotes),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
      toast.success(r.mensaje);
    },
    onError: (e: Error) => toast.error(e.message || 'Error en producción'),
  });
}

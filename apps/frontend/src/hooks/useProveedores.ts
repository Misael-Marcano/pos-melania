import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proveedoresService, ProveedorPayload } from '@/services/proveedores.service';
import { toast } from '@/store/toast.store';

export const PROVEEDORES_KEY = 'proveedores';

export function useProveedores() {
  return useQuery({
    queryKey: [PROVEEDORES_KEY],
    queryFn:  proveedoresService.getAll,
  });
}

export function useCrearProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProveedorPayload) => proveedoresService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] });
      toast.success('Proveedor creado correctamente');
    },
  });
}

export function useActualizarProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProveedorPayload> }) =>
      proveedoresService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] });
      toast.success('Proveedor actualizado');
    },
  });
}

export function useEliminarProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => proveedoresService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROVEEDORES_KEY] });
      toast.success('Proveedor eliminado');
    },
  });
}

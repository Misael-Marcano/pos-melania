import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empleadosService, CreateEmpleadoPayload, UpdateEmpleadoPayload } from '@/services/empleados.service';
import { toast } from '@/store/toast.store';

export const EMPLEADOS_KEY = 'empleados';

export function useEmpleados() {
  return useQuery({
    queryKey: [EMPLEADOS_KEY],
    queryFn:  empleadosService.getAll,
  });
}

export function useCrearEmpleado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmpleadoPayload) => empleadosService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLEADOS_KEY] });
      toast.success('Empleado creado correctamente');
    },
  });
}

export function useActualizarEmpleado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEmpleadoPayload }) =>
      empleadosService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLEADOS_KEY] });
      toast.success('Empleado actualizado');
    },
  });
}

export function useEliminarEmpleado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => empleadosService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLEADOS_KEY] });
      toast.success('Empleado desactivado');
    },
  });
}

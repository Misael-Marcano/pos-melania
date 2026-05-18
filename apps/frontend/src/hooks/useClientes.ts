import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesService } from '@/services/clientes.service';
import { ICliente } from '@pos/shared';

export const CLIENTES_KEY = 'clientes';

export function useClientes(page = 1, limit = 20, q = '') {
  return useQuery({
    queryKey: [CLIENTES_KEY, page, limit, q],
    queryFn:  () => clientesService.getAll(page, limit, q),
    placeholderData: (prev) => prev,
  });
}

export function useCliente(id: number) {
  return useQuery({
    queryKey: [CLIENTES_KEY, id],
    queryFn:  () => clientesService.getById(id),
    enabled:  !!id,
  });
}

export function useHistorialCliente(id: number) {
  return useQuery({
    queryKey: [CLIENTES_KEY, id, 'historial'],
    queryFn:  () => clientesService.getHistorial(id),
    enabled:  !!id,
  });
}

export function useCrearCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ICliente>) => clientesService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLIENTES_KEY] });
    },
  });
}

export function useActualizarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ICliente> }) =>
      clientesService.update(id, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [CLIENTES_KEY] });
      qc.invalidateQueries({ queryKey: [CLIENTES_KEY, v.id] });
    },
  });
}

export function useEliminarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => clientesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLIENTES_KEY] });
    },
  });
}

export function useEstadoCuenta(id: number) {
  return useQuery({
    queryKey: [CLIENTES_KEY, id, 'estado-cuenta'],
    queryFn:  () => clientesService.getEstadoCuenta(id),
    enabled:  !!id,
  });
}

export function useAbonar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, monto, notas }: { id: number; monto: number; notas?: string }) =>
      clientesService.abonar(id, monto, notas),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [CLIENTES_KEY] });
      qc.invalidateQueries({ queryKey: [CLIENTES_KEY, v.id, 'estado-cuenta'] });
    },
  });
}

export function useClientesConSaldo(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [CLIENTES_KEY, 'con-saldo'],
    queryFn:  clientesService.getConSaldo,
    enabled:  options?.enabled !== false,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ventasService,
  CreateVentaPayload,
  UpdateVentaPayload,
  FullUpdateVentaPayload,
  HistorialCajasFilters,
} from '@/services/ventas.service';
export type { ICajaApertura } from '@/services/ventas.service';

export const VENTAS_KEY = 'ventas';
export const CAJA_KEY   = 'caja';

// ── Listar ventas ─────────────────────────────────────────────────────────────
export function useVentas(page = 1, limit = 20, desde?: string, hasta?: string, estado?: string) {
  return useQuery({
    queryKey: [VENTAS_KEY, page, limit, desde, hasta, estado],
    queryFn:  () => ventasService.getAll(page, limit, desde, hasta, estado),
    placeholderData: (prev) => prev,
  });
}

// ── Detalle de venta ─────────────────────────────────────────────────────────
export function useVenta(id: number) {
  return useQuery({
    queryKey: [VENTAS_KEY, id],
    queryFn:  () => ventasService.getById(id),
    enabled:  !!id,
  });
}

// ── Resumen del día ───────────────────────────────────────────────────────────
export function useResumenHoy() {
  return useQuery({
    queryKey: ['resumen-hoy'],
    queryFn:  ventasService.resumenHoy,
    refetchInterval: 60_000,   // refresca cada minuto
  });
}

// ── Registrar venta ───────────────────────────────────────────────────────────
export function useRegistrarVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVentaPayload) => ventasService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] });
      qc.invalidateQueries({ queryKey: ['resumen-hoy'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });  // stock actualizado
    },
  });
}

// ── Editar venta ─────────────────────────────────────────────────────────────
export function useEditarVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateVentaPayload }) =>
      ventasService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VENTAS_KEY] }),
  });
}

// ── Editar venta completa ────────────────────────────────────────────────────
export function useFullEditarVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FullUpdateVentaPayload }) =>
      ventasService.fullUpdate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VENTAS_KEY] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
    },
  });
}

// ── Anular venta ─────────────────────────────────────────────────────────────
export function useAnularVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ventasService.anular(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [VENTAS_KEY] }),
  });
}

// ── Resumen de sesión de caja ─────────────────────────────────────────────────
export function useResumenCaja(aperturaId: number) {
  return useQuery({
    queryKey: [CAJA_KEY, 'resumen', aperturaId],
    queryFn:  () => ventasService.resumenCaja(aperturaId),
    enabled:  !!aperturaId,
    refetchInterval: 60_000,   // refresca cada minuto mientras la caja está abierta
  });
}

// ── Caja activa ───────────────────────────────────────────────────────────────
/** Si `cajaId` viene del catálogo (configuración), la sesión se busca por ID para evitar desfaces al renombrar. */
export function useCajaActiva(cajaNombre: string, cajaId?: number | null) {
  return useQuery({
    queryKey: [CAJA_KEY, 'activa', cajaId ?? 'nombre', cajaId ?? cajaNombre],
    queryFn: () =>
      cajaId != null && cajaId > 0
        ? ventasService.getCajaActivaPorCajaId(cajaId)
        : ventasService.getCajaActiva(cajaNombre),
    staleTime: 30_000,
  });
}

// ── Abrir caja ────────────────────────────────────────────────────────────────
export function useAbrirCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof ventasService.abrirCaja>[0]) =>
      ventasService.abrirCaja(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAJA_KEY] });
      qc.invalidateQueries({ queryKey: [CAJA_KEY, 'abiertas'] });
    },
  });
}

// ── Cerrar caja ───────────────────────────────────────────────────────────────
export function useCerrarCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof ventasService.cerrarCaja>[0]) =>
      ventasService.cerrarCaja(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAJA_KEY] });
      qc.invalidateQueries({ queryKey: [CAJA_KEY, 'abiertas'] });
    },
  });
}

// ── Historial de cierres ──────────────────────────────────────────────────────
export function useHistorialCajas(
  page = 1,
  limit = 20,
  filters: HistorialCajasFilters = {},
) {
  return useQuery({
    queryKey: [CAJA_KEY, 'historial', page, limit, filters],
    queryFn:  () => ventasService.historialCajas(page, limit, filters),
    placeholderData: (prev) => prev,
  });
}

/** Sesiones de caja abiertas (varias sucursales / varias cajas) */
export function useCajasAbiertas() {
  return useQuery({
    queryKey: [CAJA_KEY, 'abiertas'],
    queryFn:  () => ventasService.listCajasAbiertas(),
    staleTime: 30_000,
  });
}

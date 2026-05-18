import { useQuery } from '@tanstack/react-query';
import { reportesService } from '@/services/reportes.service';

function tiendaKey(tiendaId?: number | null) {
  return tiendaId ?? 'all';
}

export function useVentasPorDia(desde: string, hasta: string, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'ventas-por-dia', desde, hasta, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.ventasPorDia(desde, hasta, tiendaId),
    enabled:  !!(desde && hasta),
  });
}

export function useTopProductos(desde: string, hasta: string, limit = 10, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'top-productos', desde, hasta, limit, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.topProductos(desde, hasta, limit, tiendaId),
    enabled:  !!(desde && hasta),
  });
}

export function useResumenDia(fecha: string, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'resumen-dia', fecha, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.resumenDia(fecha, tiendaId),
    enabled:  !!fecha,
  });
}

export function useGanancias(desde: string, hasta: string, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'ganancias', desde, hasta, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.ganancias(desde, hasta, tiendaId),
    enabled:  !!(desde && hasta),
  });
}

export function useCompararPeriodos(referencia: string, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'comparar-periodos', referencia, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.compararPeriodos(referencia, tiendaId),
    enabled:  !!referencia,
  });
}

export function useInventarioValorizado(page = 1, limit = 25, q = '') {
  return useQuery({
    queryKey: ['reportes', 'inventario-valorizado', page, limit, q],
    queryFn:  () => reportesService.inventarioValorizado(page, limit, q),
  });
}

export function useDgii607Preview(periodo: string) {
  return useQuery({
    queryKey: ['reportes', 'dgii-607-preview', periodo],
    queryFn:  () => reportesService.dgii607Preview(periodo),
    enabled:  /^\d{6}$/.test(periodo),
  });
}

export function useDgii606Preview(periodo: string) {
  return useQuery({
    queryKey: ['reportes', 'dgii-606-preview', periodo],
    queryFn:  () => reportesService.dgii606Preview(periodo),
    enabled:  /^\d{6}$/.test(periodo),
  });
}

export function useTopClientes(desde: string, hasta: string, limit = 10, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'top-clientes', desde, hasta, limit, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.topClientes(desde, hasta, limit, tiendaId),
    enabled:  !!(desde && hasta),
  });
}

export function useResumenPorSucursal(tiendaId: number | null, desde: string, hasta: string) {
  return useQuery({
    queryKey: ['reportes', 'por-sucursal', tiendaId, desde, hasta],
    queryFn:  () => reportesService.resumenPorSucursal(tiendaId!, desde, hasta),
    enabled:  !!(tiendaId && desde && hasta),
  });
}

export function useVentasPorUsuario(desde: string, hasta: string, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'ventas-por-usuario', desde, hasta, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.ventasPorUsuario(desde, hasta, tiendaId),
    enabled:  !!(desde && hasta),
  });
}

export function useVentasPorCaja(desde: string, hasta: string, tiendaId?: number | null) {
  return useQuery({
    queryKey: ['reportes', 'ventas-por-caja', desde, hasta, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.ventasPorCaja(desde, hasta, tiendaId),
    enabled:  !!(desde && hasta),
  });
}

export function useConciliacionCaja(
  desde: string,
  hasta: string,
  tiendaId?: number | null,
) {
  return useQuery({
    queryKey: ['reportes', 'conciliacion-caja', desde, hasta, tiendaKey(tiendaId)],
    queryFn:  () => reportesService.conciliacionCajaLista(desde, hasta, tiendaId),
    enabled:  !!(desde && hasta),
  });
}

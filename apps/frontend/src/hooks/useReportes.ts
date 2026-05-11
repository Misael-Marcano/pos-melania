import { useQuery } from '@tanstack/react-query';
import { reportesService } from '@/services/reportes.service';

export function useVentasPorDia(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['reportes', 'ventas-por-dia', desde, hasta],
    queryFn:  () => reportesService.ventasPorDia(desde, hasta),
    enabled:  !!(desde && hasta),
  });
}

export function useTopProductos(desde: string, hasta: string, limit = 10) {
  return useQuery({
    queryKey: ['reportes', 'top-productos', desde, hasta, limit],
    queryFn:  () => reportesService.topProductos(desde, hasta, limit),
    enabled:  !!(desde && hasta),
  });
}

export function useResumenDia(fecha: string) {
  return useQuery({
    queryKey: ['reportes', 'resumen-dia', fecha],
    queryFn:  () => reportesService.resumenDia(fecha),
    enabled:  !!fecha,
  });
}

export function useGanancias(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['reportes', 'ganancias', desde, hasta],
    queryFn:  () => reportesService.ganancias(desde, hasta),
    enabled:  !!(desde && hasta),
  });
}

export function useInventarioValorizado() {
  return useQuery({
    queryKey: ['reportes', 'inventario-valorizado'],
    queryFn:  reportesService.inventarioValorizado,
  });
}

export function useTopClientes(desde: string, hasta: string, limit = 10) {
  return useQuery({
    queryKey: ['reportes', 'top-clientes', desde, hasta, limit],
    queryFn:  () => reportesService.topClientes(desde, hasta, limit),
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

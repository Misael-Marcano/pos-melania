import apiClient from './api.client';
import { IVenta, PaginatedResponse } from '@pos/shared';

export interface CreateVentaPayload {
  clienteId?:   number;
  metodoPago:   'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  pagos?:       { metodo: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'; monto: number }[];
  descuento?:   number;
  usarNCF?:     boolean;
  tipoNCF?:     '01' | '02' | '04' | '14' | '15';
  notas?:       string;
  fechaVenta?:  string;
  detalles: {
    articuloId:     number;
    cantidad:       number;
    precioUnitario: number;
    descuento?:     number;
  }[];
}

export interface UpdateVentaPayload {
  metodoPago?: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  clienteId?:  number | null;
  notas?:      string | null;
}

export interface FullUpdateVentaPayload {
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
  clienteId?: number | null;
  descuento?: number;
  notas?:     string | null;
  detalles: {
    articuloId:     number;
    cantidad:       number;
    precioUnitario: number;
    descuento?:     number;
  }[];
}

export interface AperturaCajaPayload {
  cajaNombre:     string;
  denominaciones: Record<string, number>;
  montoApertura:  number;
}

export interface CierreCajaPayload {
  aperturaId:     number;
  denominaciones: Record<string, number>;
  montoCierre:    number;
  notas?:         string;
}

export const ventasService = {
  getAll: async (page = 1, limit = 20, desde?: string, hasta?: string, estado?: string): Promise<PaginatedResponse<IVenta>> => {
    const { data } = await apiClient.get('/ventas', { params: { page, limit, desde, hasta, estado } });
    return data;
  },

  getById: async (id: number): Promise<IVenta> => {
    const { data } = await apiClient.get(`/ventas/${id}`);
    return data.data;
  },

  create: async (payload: CreateVentaPayload): Promise<IVenta> => {
    const { data } = await apiClient.post('/ventas', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateVentaPayload): Promise<IVenta> => {
    const { data } = await apiClient.patch(`/ventas/${id}`, payload);
    return data.data;
  },

  fullUpdate: async (id: number, payload: FullUpdateVentaPayload): Promise<IVenta> => {
    const { data } = await apiClient.put(`/ventas/${id}`, payload);
    return data.data;
  },

  anular: async (id: number): Promise<void> => {
    await apiClient.patch(`/ventas/${id}/anular`);
  },

  resumenHoy: async (): Promise<{ totalMonto: number; totalTransacciones: number }> => {
    const { data } = await apiClient.get('/ventas/resumen-hoy');
    return data.data;
  },

  abrirCaja: async (payload: AperturaCajaPayload) => {
    const { data } = await apiClient.post('/ventas/caja/abrir', payload);
    return data.data;
  },

  cerrarCaja: async (payload: CierreCajaPayload) => {
    const { data } = await apiClient.post('/ventas/caja/cerrar', payload);
    return data.data;
  },

  getCajaActiva: async (nombre: string) => {
    const { data } = await apiClient.get(`/ventas/caja/activa/${nombre}`);
    return data.data;
  },

  pdfCierre: async (aperturaId: number): Promise<void> => {
    const response = await apiClient.get(`/ventas/caja/${aperturaId}/pdf`, { responseType: 'blob' });
    const url  = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href     = url;
    link.download = `cierre-caja-${aperturaId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  resumenCaja: async (aperturaId: number): Promise<{
    totalEfectivo: number;
    totalGastos:   number;
    fechaApertura: string;
  }> => {
    const { data } = await apiClient.get(`/ventas/caja/resumen/${aperturaId}`);
    return data.data;
  },

  historialCajas: async (page = 1, limit = 20): Promise<{
    data: ICajaApertura[];
    total: number; page: number; limit: number;
  }> => {
    const { data } = await apiClient.get('/ventas/caja/historial', { params: { page, limit } });
    return data;
  },
};

export interface ICajaApertura {
  id: number;
  cajaNombre: string;
  montoApertura: number;
  montoCierre?: number;
  fechaApertura: string;
  fechaCierre?: string;
  notas?: string;
  usuario?: { id: number; nombre: string };
}

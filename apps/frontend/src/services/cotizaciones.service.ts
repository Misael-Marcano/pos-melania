import apiClient from './api.client';
import { ICotizacion, EstadoCotizacion, PaginatedResponse } from '@pos/shared';

export interface CreateCotizacionDetallePayload {
  articuloId:     number;
  cantidad:       number;
  precioUnitario: number;
  descuento?:     number;
}

export interface CreateCotizacionPayload {
  clienteId?:   number;
  validezDias?: number;
  notas?:       string;
  descuento?:   number;
  detalles:     CreateCotizacionDetallePayload[];
}

export interface UpdateCotizacionPayload extends Partial<CreateCotizacionPayload> {}

export interface CambiarEstadoPayload {
  estado: EstadoCotizacion;
}

export const cotizacionesService = {
  getAll: async (
    page = 1,
    limit = 20,
    estado = ''
  ): Promise<PaginatedResponse<ICotizacion>> => {
    const { data } = await apiClient.get('/cotizaciones', {
      params: { page, limit, ...(estado ? { estado } : {}) },
    });
    return data;
  },

  getById: async (id: number): Promise<ICotizacion> => {
    const { data } = await apiClient.get(`/cotizaciones/${id}`);
    return data.data;
  },

  create: async (payload: CreateCotizacionPayload): Promise<ICotizacion> => {
    const { data } = await apiClient.post('/cotizaciones', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateCotizacionPayload): Promise<ICotizacion> => {
    const { data } = await apiClient.put(`/cotizaciones/${id}`, payload);
    return data.data;
  },

  cambiarEstado: async (id: number, payload: CambiarEstadoPayload): Promise<ICotizacion> => {
    const { data } = await apiClient.patch(`/cotizaciones/${id}/estado`, payload);
    return data.data;
  },

  convertirAVenta: async (id: number) => {
    const { data } = await apiClient.post(`/cotizaciones/${id}/convertir`);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/cotizaciones/${id}`);
  },

  checkVencidas: async (): Promise<{ actualizadas: number }> => {
    const { data } = await apiClient.get('/cotizaciones/check-vencidas');
    return data.data;
  },
};

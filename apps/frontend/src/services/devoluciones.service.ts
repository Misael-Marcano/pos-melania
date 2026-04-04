import apiClient from './api.client';
import { IDevolucion, MetodoPago } from '@pos/shared';

export interface DetalleDevolucionInput {
  articuloId:          number;
  cantidad:            number;
  precioUnitario:      number;
  regresaAInventario?: boolean;
}

export interface CreateDevolucionPayload {
  ventaId:          number;
  motivo:           string;
  notas?:           string;
  metodoReembolso?: MetodoPago;
  detalles:         DetalleDevolucionInput[];
}

export const devolucionesService = {
  getAll: async (estado?: string): Promise<IDevolucion[]> => {
    const params = estado ? `?estado=${estado}` : '';
    const { data } = await apiClient.get(`/devoluciones${params}`);
    return data.data;
  },

  getById: async (id: number): Promise<IDevolucion> => {
    const { data } = await apiClient.get(`/devoluciones/${id}`);
    return data.data;
  },

  getByVenta: async (ventaId: number): Promise<IDevolucion[]> => {
    const { data } = await apiClient.get(`/devoluciones/venta/${ventaId}`);
    return data.data;
  },

  create: async (payload: CreateDevolucionPayload): Promise<IDevolucion> => {
    const { data } = await apiClient.post('/devoluciones', payload);
    return data.data;
  },

  aprobar: async (id: number): Promise<IDevolucion> => {
    const { data } = await apiClient.patch(`/devoluciones/${id}/aprobar`);
    return data.data;
  },

  rechazar: async (id: number, motivo?: string): Promise<IDevolucion> => {
    const { data } = await apiClient.patch(`/devoluciones/${id}/rechazar`, { motivo });
    return data.data;
  },
};

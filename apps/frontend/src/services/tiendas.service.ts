import apiClient from './api.client';
import { ITienda } from '@pos/shared';

export interface TiendaPayload {
  nombre:     string;
  direccion?: string;
  telefono?:  string;
  email?:     string;
}

export const tiendasService = {
  getAll: async (): Promise<ITienda[]> => {
    const { data } = await apiClient.get('/tiendas');
    return data.data;
  },

  getById: async (id: number): Promise<ITienda> => {
    const { data } = await apiClient.get(`/tiendas/${id}`);
    return data.data;
  },

  create: async (payload: TiendaPayload): Promise<ITienda> => {
    const { data } = await apiClient.post('/tiendas', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<TiendaPayload>): Promise<ITienda> => {
    const { data } = await apiClient.put(`/tiendas/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tiendas/${id}`);
  },
};

import apiClient from './api.client';
import { IKit } from '@pos/shared';

export interface KitPayload {
  nombre:      string;
  precio:      number;
  descripcion?: string;
  detalles:    { articuloId: number; cantidad: number }[];
}

export const kitsService = {
  getAll: async (): Promise<IKit[]> => {
    const { data } = await apiClient.get('/kits');
    return data.data;
  },

  getById: async (id: number): Promise<IKit> => {
    const { data } = await apiClient.get(`/kits/${id}`);
    return data.data;
  },

  create: async (payload: KitPayload): Promise<IKit> => {
    const { data } = await apiClient.post('/kits', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<KitPayload>): Promise<IKit> => {
    const { data } = await apiClient.put(`/kits/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/kits/${id}`);
  },
};

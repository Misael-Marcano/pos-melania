import apiClient from './api.client';
import { ICaja } from '@pos/shared';

export interface CajaPayload {
  nombre:   string;
  tiendaId: number;
  notas?:   string;
}

export const cajasService = {
  getAll: async (tiendaId?: number): Promise<ICaja[]> => {
    const { data } = await apiClient.get('/cajas', {
      params: tiendaId != null ? { tiendaId } : undefined,
    });
    return data.data;
  },

  getById: async (id: number): Promise<ICaja> => {
    const { data } = await apiClient.get(`/cajas/${id}`);
    return data.data;
  },

  create: async (payload: CajaPayload): Promise<ICaja> => {
    const { data } = await apiClient.post('/cajas', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<CajaPayload> & { activo?: boolean; notas?: string | null }): Promise<ICaja> => {
    const { data } = await apiClient.put(`/cajas/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/cajas/${id}`);
  },
};

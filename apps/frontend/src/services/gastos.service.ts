import apiClient from './api.client';
import { IGasto, PaginatedResponse } from '@pos/shared';

export interface CreateGastoPayload {
  escribe:           string;
  descripcion?:      string;
  categoria:         string;
  fecha:             string;
  cantidad:          number;
  impuesto?:         number;
  nombreRecipiente?: string;
}

export const gastosService = {
  getAll: async (page = 1, limit = 20, q = ''): Promise<PaginatedResponse<IGasto>> => {
    const { data } = await apiClient.get('/gastos', { params: { page, limit, q } });
    return data;
  },

  create: async (payload: CreateGastoPayload): Promise<IGasto> => {
    const { data } = await apiClient.post('/gastos', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<CreateGastoPayload>): Promise<IGasto> => {
    const { data } = await apiClient.put(`/gastos/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/gastos/${id}`);
  },
};

import apiClient from './api.client';
import { IComprobante } from '@pos/shared';

export interface CreateComprobantePayload {
  descripcion:     string;
  series:          string;
  tipo:            string;
  desde:           string;
  hasta:           string;
  secuenciaActual: string;
}

export const comprobantesService = {
  getAll: async (): Promise<IComprobante[]> => {
    const { data } = await apiClient.get('/comprobantes');
    return data.data;
  },

  create: async (payload: CreateComprobantePayload): Promise<IComprobante> => {
    const { data } = await apiClient.post('/comprobantes', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<CreateComprobantePayload>): Promise<IComprobante> => {
    const { data } = await apiClient.put(`/comprobantes/${id}`, payload);
    return data.data;
  },
};

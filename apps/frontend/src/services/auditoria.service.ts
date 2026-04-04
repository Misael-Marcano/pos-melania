import apiClient from './api.client';
import { IAuditLog } from '@pos/shared';

export interface AuditoriaParams {
  page?:      number;
  limit?:     number;
  tabla?:     string;
  operacion?: string;
  usuarioId?: number;
  desde?:     string;
  hasta?:     string;
}

export const auditoriaService = {
  findAll: async (params: AuditoriaParams = {}) => {
    const { data } = await apiClient.get('/auditoria', { params });
    return data as {
      success: boolean;
      data: IAuditLog[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
  },

  getTablas: async (): Promise<string[]> => {
    const { data } = await apiClient.get('/auditoria/tablas');
    return data.data as string[];
  },
};

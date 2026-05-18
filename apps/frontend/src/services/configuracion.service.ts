import apiClient from './api.client';
import { IConfiguracion } from '@pos/shared';

export type FiscalStatus = {
  ok: boolean;
  jurisdiccion: string;
  providerId: string;
  rncConfigured: boolean;
  tasaItbis: number;
};

export const configuracionService = {
  get: async (): Promise<IConfiguracion> => {
    const { data } = await apiClient.get('/configuracion');
    return data.data;
  },

  update: async (payload: Partial<IConfiguracion>): Promise<IConfiguracion> => {
    const { data } = await apiClient.put('/configuracion', payload);
    return data.data;
  },

  fiscalStatus: async (): Promise<FiscalStatus> => {
    const { data } = await apiClient.get('/configuracion/fiscal-status');
    return data.data;
  },
};

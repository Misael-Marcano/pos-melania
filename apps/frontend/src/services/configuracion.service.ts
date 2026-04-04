import apiClient from './api.client';
import { IConfiguracion } from '@pos/shared';

export const configuracionService = {
  get: async (): Promise<IConfiguracion> => {
    const { data } = await apiClient.get('/configuracion');
    return data.data;
  },

  update: async (payload: Partial<IConfiguracion>): Promise<IConfiguracion> => {
    const { data } = await apiClient.put('/configuracion', payload);
    return data.data;
  },
};

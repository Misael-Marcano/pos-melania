import apiClient from './api.client';
import { IProveedor } from '@pos/shared';

export interface ProveedorPayload {
  nombre:     string;
  contacto?:  string;
  telefono?:  string;
  correo?:    string;
  direccion?: string;
  rnc?:       string;
}

export const proveedoresService = {
  getAll: async (): Promise<IProveedor[]> => {
    const { data } = await apiClient.get('/proveedores');
    return data.data;
  },

  create: async (payload: ProveedorPayload): Promise<IProveedor> => {
    const { data } = await apiClient.post('/proveedores', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<ProveedorPayload>): Promise<IProveedor> => {
    const { data } = await apiClient.put(`/proveedores/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/proveedores/${id}`);
  },
};

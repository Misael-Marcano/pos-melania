import apiClient from './api.client';
import { IEmpleado } from '@pos/shared';

export interface CreateEmpleadoPayload {
  nombre:    string;
  correo:    string;
  telefono?: string;
  rol:       'admin' | 'cajero' | 'soporte' | 'contador';
  password:  string;
  foto?:     string;
  tiendaId?: number | null;
}

export interface UpdateEmpleadoPayload {
  nombre?:    string;
  correo?:    string;
  telefono?:  string;
  rol?:       'admin' | 'cajero' | 'soporte' | 'contador';
  password?:  string;
  tiendaId?:  number | null;
}

export const empleadosService = {
  getAll: async (): Promise<IEmpleado[]> => {
    const { data } = await apiClient.get('/empleados');
    return data.data;
  },

  create: async (payload: CreateEmpleadoPayload): Promise<IEmpleado> => {
    const { data } = await apiClient.post('/empleados', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateEmpleadoPayload): Promise<IEmpleado> => {
    const { data } = await apiClient.put(`/empleados/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/empleados/${id}`);
  },
};

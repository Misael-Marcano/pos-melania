import apiClient from './api.client';
import { ICliente, IEstadoCuenta, PaginatedResponse, ApiResponse } from '@pos/shared';

export const clientesService = {
  getAll: async (page = 1, limit = 20, q = ''): Promise<PaginatedResponse<ICliente>> => {
    const { data } = await apiClient.get('/clientes', { params: { page, limit, q } });
    return data;
  },

  getById: async (id: number): Promise<ICliente> => {
    const { data } = await apiClient.get(`/clientes/${id}`);
    return data.data;
  },

  create: async (payload: Partial<ICliente>): Promise<ICliente> => {
    const { data } = await apiClient.post('/clientes', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<ICliente>): Promise<ICliente> => {
    const { data } = await apiClient.put(`/clientes/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/clientes/${id}`);
  },

  getHistorial: async (id: number) => {
    const { data } = await apiClient.get(`/clientes/${id}/historial`);
    return data.data;
  },

  getEstadoCuenta: async (id: number): Promise<IEstadoCuenta> => {
    const { data } = await apiClient.get(`/clientes/${id}/estado-cuenta`);
    return data.data;
  },

  abonar: async (id: number, monto: number, notas?: string) => {
    const { data } = await apiClient.post(`/clientes/${id}/abonar`, { monto, notas });
    return data.data;
  },

  getConSaldo: async (): Promise<{ data: ICliente[]; total: number }> => {
    const { data } = await apiClient.get('/clientes/con-saldo');
    return data.data;
  },
};

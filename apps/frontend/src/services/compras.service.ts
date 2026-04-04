import apiClient from './api.client';
import { IOrdenCompra } from '@pos/shared';

export interface DetalleInput {
  articuloId:    number;
  cantidad:      number;
  costoUnitario: number;
}

export interface CreateOrdenPayload {
  proveedorId?:   number;
  notas?:         string;
  fechaEsperada?: string;
  detalles:       DetalleInput[];
}

export interface RecepcionInput {
  detalleId:        number;
  cantidadRecibida: number;
}

export const comprasService = {
  getAll: async (estado?: string): Promise<IOrdenCompra[]> => {
    const params = estado ? `?estado=${estado}` : '';
    const { data } = await apiClient.get(`/compras${params}`);
    return data.data;
  },

  getById: async (id: number): Promise<IOrdenCompra> => {
    const { data } = await apiClient.get(`/compras/${id}`);
    return data.data;
  },

  create: async (payload: CreateOrdenPayload): Promise<IOrdenCompra> => {
    const { data } = await apiClient.post('/compras', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<CreateOrdenPayload>): Promise<IOrdenCompra> => {
    const { data } = await apiClient.put(`/compras/${id}`, payload);
    return data.data;
  },

  enviar: async (id: number): Promise<IOrdenCompra> => {
    const { data } = await apiClient.patch(`/compras/${id}/enviar`);
    return data.data;
  },

  recibir: async (id: number, recepciones: RecepcionInput[]): Promise<IOrdenCompra> => {
    const { data } = await apiClient.patch(`/compras/${id}/recibir`, { recepciones });
    return data.data;
  },

  cancelar: async (id: number): Promise<IOrdenCompra> => {
    const { data } = await apiClient.patch(`/compras/${id}/cancelar`);
    return data.data;
  },
};

import apiClient from './api.client';
import { IReceta } from '@pos/shared';

export interface IngredienteRecetaPayload {
  articuloId: number;
  cantidad:   number;
}

export interface CreateRecetaPayload {
  nombre:               string;
  descripcion?:         string;
  articuloResultadoId:  number;
  cantidadResultado?:   number;
  ingredientes:         IngredienteRecetaPayload[];
}

export type UpdateRecetaPayload = Partial<CreateRecetaPayload>;

export const recetasService = {
  getAll: async (): Promise<IReceta[]> => {
    const { data } = await apiClient.get('/recetas');
    return data.data;
  },

  getById: async (id: number): Promise<IReceta> => {
    const { data } = await apiClient.get(`/recetas/${id}`);
    return data.data;
  },

  create: async (payload: CreateRecetaPayload): Promise<IReceta> => {
    const { data } = await apiClient.post('/recetas', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateRecetaPayload): Promise<IReceta> => {
    const { data } = await apiClient.put(`/recetas/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/recetas/${id}`);
  },

  producir: async (id: number, lotes: number): Promise<{ mensaje: string }> => {
    const { data } = await apiClient.post(`/recetas/${id}/producir`, { lotes });
    return data.data;
  },
};

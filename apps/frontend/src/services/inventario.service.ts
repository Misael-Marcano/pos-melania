import apiClient from './api.client';
import { IArticulo, ICategoria, IMovimientoInventario, PaginatedResponse } from '@pos/shared';

export const inventarioService = {
  getAll: async (page = 1, limit = 20, q = '', categoriaId?: number): Promise<PaginatedResponse<IArticulo>> => {
    const { data } = await apiClient.get('/inventario', { params: { page, limit, q, categoriaId } });
    return data;
  },

  getById: async (id: number): Promise<IArticulo> => {
    const { data } = await apiClient.get(`/inventario/${id}`);
    return data.data;
  },

  getByBarcode: async (codigo: string): Promise<IArticulo> => {
    const { data } = await apiClient.get(`/inventario/barcode/${codigo}`);
    return data.data;
  },

  create: async (payload: Partial<IArticulo> & { categoriaId: number }): Promise<IArticulo> => {
    const { data } = await apiClient.post('/inventario', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<IArticulo>): Promise<IArticulo> => {
    const { data } = await apiClient.put(`/inventario/${id}`, payload);
    return data.data;
  },

  clone: async (id: number): Promise<IArticulo> => {
    const { data } = await apiClient.post(`/inventario/${id}/clonar`);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/inventario/${id}`);
  },

  ajustar: async (id: number, cantidad: number): Promise<IArticulo> => {
    const { data } = await apiClient.patch(`/inventario/${id}/ajustar`, { cantidad });
    return data.data;
  },

  getCategorias: async (): Promise<ICategoria[]> => {
    const { data } = await apiClient.get('/inventario/categorias');
    return data.data;
  },

  createCategoria: async (nombre: string): Promise<ICategoria> => {
    const { data } = await apiClient.post('/inventario/categorias', { nombre });
    return data.data;
  },

  deleteCategoria: async (id: number): Promise<void> => {
    await apiClient.delete(`/inventario/categorias/${id}`);
  },

  getStockBajo: async (minimo = 10): Promise<IArticulo[]> => {
    const { data } = await apiClient.get('/inventario/stock-bajo', { params: { minimo } });
    return data.data;
  },

  getMovimientos: async (articuloId: number, page = 1, limit = 20): Promise<PaginatedResponse<IMovimientoInventario>> => {
    const { data } = await apiClient.get(`/inventario/${articuloId}/movimientos`, { params: { page, limit } });
    return data;
  },

  importarCSV: async (csv: string): Promise<{ creados: number; actualizados: number; errores: string[] }> => {
    const { data } = await apiClient.post('/inventario/importar-csv', { csv });
    return data.data;
  },
};

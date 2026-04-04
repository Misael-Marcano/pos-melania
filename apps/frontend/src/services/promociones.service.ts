import apiClient from './api.client';

export type TipoPromocion = 'PORCENTAJE' | 'MONTO_FIJO';

export interface IPromocion {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoPromocion;
  valor: number;
  montoMinimo: number;
  usoMaximo?: number;
  usosActuales: number;
  fechaInicio?: string;
  fechaFin?: string;
  activa: boolean;
  createdAt: string;
}

export interface ValidarPromoResult {
  promocion: IPromocion;
  descuentoMonto: number;
}

export const promocionesService = {
  getAll: async (q?: string): Promise<IPromocion[]> => {
    const { data } = await apiClient.get('/promociones', { params: { q } });
    return data.data;
  },

  getById: async (id: number): Promise<IPromocion> => {
    const { data } = await apiClient.get(`/promociones/${id}`);
    return data.data;
  },

  validar: async (codigo: string, total: number): Promise<ValidarPromoResult> => {
    const { data } = await apiClient.post('/promociones/validar', { codigo, total });
    return data.data;
  },

  create: async (payload: Partial<IPromocion>): Promise<IPromocion> => {
    const { data } = await apiClient.post('/promociones', payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<IPromocion>): Promise<IPromocion> => {
    const { data } = await apiClient.put(`/promociones/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/promociones/${id}`);
  },
};

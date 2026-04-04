import apiClient from './api.client';

export type EstadoTarjeta = 'ACTIVA' | 'AGOTADA' | 'VENCIDA' | 'CANCELADA';

export interface MovimientoTarjeta {
  tipo:   'CREACION' | 'RECARGA' | 'USO' | 'CANCELACION';
  monto:  number;
  fecha:  string;
  notas?: string;
}

export interface ITarjetaRegalo {
  id:               number;
  codigo:           string;
  saldoInicial:     number;
  saldoActual:      number;
  estado:           EstadoTarjeta;
  fechaVencimiento?: string;
  notas?:           string;
  movimientosJson?: string;
  createdAt:        string;
  updatedAt:        string;
}

export interface CreateTarjetaPayload {
  saldoInicial:     number;
  fechaVencimiento?: string;
  notas?:           string;
}

export interface RecargarPayload {
  monto: number;
  notas?: string;
}

export interface UsarPayload {
  monto: number;
  notas?: string;
}

export interface PaginatedTarjetas {
  data:  ITarjetaRegalo[];
  total: number;
  page:  number;
  limit: number;
}

export const tarjetasRegaloService = {
  getAll: async (page = 1, limit = 20, q = '', estado = ''): Promise<PaginatedTarjetas> => {
    const { data } = await apiClient.get('/tarjetas-regalo', { params: { page, limit, q, estado } });
    return data;
  },

  getById: async (id: number): Promise<ITarjetaRegalo> => {
    const { data } = await apiClient.get(`/tarjetas-regalo/${id}`);
    return data.data;
  },

  getByCodigo: async (codigo: string): Promise<ITarjetaRegalo> => {
    const { data } = await apiClient.get(`/tarjetas-regalo/codigo/${codigo}`);
    return data.data;
  },

  create: async (payload: CreateTarjetaPayload): Promise<ITarjetaRegalo> => {
    const { data } = await apiClient.post('/tarjetas-regalo', payload);
    return data.data;
  },

  recargar: async (id: number, payload: RecargarPayload): Promise<ITarjetaRegalo> => {
    const { data } = await apiClient.post(`/tarjetas-regalo/${id}/recargar`, payload);
    return data.data;
  },

  usar: async (id: number, payload: UsarPayload): Promise<ITarjetaRegalo> => {
    const { data } = await apiClient.post(`/tarjetas-regalo/${id}/usar`, payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<CreateTarjetaPayload> & { estado?: EstadoTarjeta }): Promise<ITarjetaRegalo> => {
    const { data } = await apiClient.put(`/tarjetas-regalo/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tarjetas-regalo/${id}`);
  },
};

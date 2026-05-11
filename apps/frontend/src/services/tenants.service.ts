import apiClient from './api.client';

export interface TenantRow {
  id:     number;
  nombre: string;
  slug:   string;
  activo: boolean;
}

export interface TenantPanel {
  id:                   number;
  nombre:               string;
  slug:                 string;
  activo:               boolean;
  planCode:             string;
  planLabel:            string;
  billingStatus:        string | null;
  stripeCustomerId:     string | null;
  stripeSubscriptionId: string | null;
  usage: {
    seats:            number;
    tiendasActivas:   number;
    articulosActivos: number;
  };
  limits: {
    maxUsers:     number | null;
    maxTiendas:   number | null;
    maxArticulos: number | null;
  };
  createdAt: string;
}

export const tenantsService = {
  list: async (): Promise<TenantRow[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: TenantRow[] }>('/tenants');
    return data.data;
  },
  panel: async (): Promise<TenantPanel[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: TenantPanel[] }>('/tenants/panel');
    return data.data;
  },
};

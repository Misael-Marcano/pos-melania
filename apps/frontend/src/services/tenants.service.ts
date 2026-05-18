import type { TenantPanelRow } from '@pos/shared';
import apiClient from './api.client';

export type { TenantPanelRow };
/** @deprecated Usar `TenantPanelRow` */
export type TenantPanel = TenantPanelRow;

export interface TenantRow {
  id:     number;
  nombre: string;
  slug:   string;
  activo: boolean;
}

export const tenantsService = {
  list: async (): Promise<TenantRow[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: TenantRow[] }>('/tenants');
    return data.data;
  },
  panel: async (): Promise<TenantPanelRow[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: TenantPanelRow[] }>('/tenants/panel');
    return data.data;
  },
};

import type { ApiResponse, SaasContext } from '@pos/shared';
import apiClient from './api.client';

export async function getSaasContext(): Promise<SaasContext> {
  const { data } = await apiClient.get<ApiResponse<SaasContext>>('/saas/context');
  return data.data;
}

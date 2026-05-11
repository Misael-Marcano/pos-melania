import apiClient from './api.client';
import { TokenResponse } from '@pos/shared';

export const authService = {
  login: async (
    email: string,
    password: string,
    tenantSlug?: string,
  ): Promise<TokenResponse> => {
    const headers: Record<string, string> = {};
    if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;
    const { data } = await apiClient.post(
      '/auth/login',
      { email, password },
      { headers },
    );
    return data.data;
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  profile: async () => {
    const { data } = await apiClient.get('/auth/profile');
    return data.data;
  },
};

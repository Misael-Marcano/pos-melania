import type { ApiResponse } from '@pos/shared';
import apiClient from './api.client';

export interface BillingPublicStatus {
  provider: 'stripe' | 'none';
  configured: boolean;
  webhookConfigured: boolean;
  pricesConfigured: boolean;
  hint: string;
  tenant?: {
    id: number;
    planCode: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    billingStatus: string | null;
  };
}

export async function getBillingStatus(): Promise<BillingPublicStatus> {
  const { data } = await apiClient.get<ApiResponse<BillingPublicStatus>>('/billing/status');
  return data.data;
}

export async function createCheckoutSession(payload: {
  successUrl: string;
  cancelUrl: string;
  planCode?: 'starter' | 'standard' | 'enterprise';
}): Promise<{ url: string | null }> {
  const { data } = await apiClient.post<ApiResponse<{ url: string | null }>>(
    '/billing/create-checkout-session',
    payload,
  );
  return data.data;
}

export async function createPortalSession(payload: {
  returnUrl: string;
}): Promise<{ url: string | null }> {
  const { data } = await apiClient.post<ApiResponse<{ url: string | null }>>(
    '/billing/create-portal-session',
    payload,
  );
  return data.data;
}

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { messageForAxiosNoResponse } from '@/lib/api-network-error';
import { appPath, isStaticSite } from '@/lib/site-mode';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request: adjunta access token y X-Tenant-Id (rol plataforma) ──────────────
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pos_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    try {
      const raw = localStorage.getItem('pos_user');
      if (raw) {
        const u = JSON.parse(raw) as { rol?: string };
        if (u.rol === 'plataforma') {
          const tid = localStorage.getItem('pos_platform_tenant_id');
          if (tid) (config.headers as Record<string, string>)['X-Tenant-Id'] = tid;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return config;
});

// ── Refresh token logic ───────────────────────────────────────────────────────
// Evita múltiples llamadas simultáneas al endpoint de refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
}

function forceLogout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_refresh_token');
  localStorage.removeItem('pos_user');
  window.location.href = isStaticSite ? appPath('/') : appPath('/login');
}

// ── Response: 401 → intenta refresh, luego reintenta la petición ──────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<{ message?: string; data?: { code?: string } }>) => {
    if (isStaticSite) {
      return Promise.reject(
        new Error('Esta versión del sitio es solo informativa y no tiene API.'),
      );
    }

    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    /** Cuenta suspendida (impago o trial vencido con enforcement) — pantalla dedicada. */
    if (err.response?.status === 402 && typeof window !== 'undefined') {
      if (window.location.pathname !== '/cuenta-suspendida') {
        const body = err.response.data;
        sessionStorage.setItem(
          'pos_access_block',
          JSON.stringify({
            code: body?.data?.code ?? 'BILLING_SUSPENDED',
            message: body?.message ?? 'Acceso restringido',
          }),
        );
        window.location.replace('/cuenta-suspendida');
      }
      return Promise.reject(err);
    }

    // Solo intentar refresh en 401, una sola vez, y no en el propio endpoint de auth
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (err.response?.status !== 401 || original?._retry || isAuthEndpoint) {
      if (!err.response || err.response.status === 0) {
        return Promise.reject(new Error(messageForAxiosNoResponse(err)));
      }
      const status = err.response.status;
      const body = err.response.data;
      const serverMsg =
        typeof body?.message === 'string' ? body.message.trim() : '';
      /** 403: límites de plan, features desactivadas o permisos — mensaje distinto del fallback genérico de otros códigos. */
      if (status === 403) {
        const msg =
          serverMsg ||
          'Esta acción no está disponible con tu plan o permisos actuales. Actualiza tu suscripción en Configuración → Plan o consulta con un administrador.';
        return Promise.reject(new Error(msg));
      }
      const msg = serverMsg || err.message || 'Error';
      return Promise.reject(new Error(msg));
    }

    if (isRefreshing) {
      // Si ya hay un refresh en curso, encolar esta petición
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('pos_refresh_token')
      : null;

    if (!refreshToken) {
      isRefreshing = false;
      forceLogout();
      return Promise.reject(new Error('Sesión expirada'));
    }

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/refresh`,
        { refreshToken },
        { timeout: 10000 }
      );
      const newToken = data.data?.accessToken ?? data.accessToken;
      const newRefresh = data.data?.refreshToken ?? data.refreshToken;

      localStorage.setItem('pos_token', newToken);
      if (newRefresh) localStorage.setItem('pos_refresh_token', newRefresh);

      original.headers.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);

      return apiClient(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      forceLogout();
      return Promise.reject(new Error('Sesión expirada, inicia sesión nuevamente'));
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;

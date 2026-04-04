import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request: adjunta access token ─────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pos_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
  window.location.href = '/login';
}

// ── Response: 401 → intenta refresh, luego reintenta la petición ──────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<{ message?: string }>) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Solo intentar refresh en 401, una sola vez, y no en el propio endpoint de auth
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (err.response?.status !== 401 || original?._retry || isAuthEndpoint) {
      const msg = err.response?.data?.message ?? err.message ?? 'Error de red';
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

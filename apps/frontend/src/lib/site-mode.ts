/**
 * GitHub Pages u otro host solo estático (sin API).
 * Se activa en build con `GITHUB_PAGES=1` → `NEXT_PUBLIC_STATIC_SITE=1`.
 */
export const isStaticSite = process.env.NEXT_PUBLIC_STATIC_SITE === '1';

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');

/** Ruta con basePath del repo (p. ej. `/pos-melania/login`). */
export function appPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!basePath) return p;
  return `${basePath}${p}`;
}

/** Limpia sesión guardada para no intentar refresh contra un API inexistente. */
export function clearClientAuthStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_refresh_token');
  localStorage.removeItem('pos_user');
  localStorage.removeItem('pos_platform_tenant_id');
  sessionStorage.removeItem('pos_access_block');
}

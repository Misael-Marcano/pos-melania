/**
 * Slug de organización para login multi-tenant (cabecera `X-Tenant-Slug`).
 * - `NEXT_PUBLIC_TENANT_SLUG`: fijo por build (un cliente por despliegue).
 * - Subdominio: `acme.midominio.com` → `acme`; `acme.localhost` → `acme`.
 */
export function getLoginTenantSlug(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_TENANT_SLUG?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window === 'undefined') return undefined;

  const h = window.location.hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return undefined;

  if (h.endsWith('.localhost')) {
    const sub = h.split('.')[0];
    return sub && sub !== 'www' ? sub : undefined;
  }

  const parts = h.split('.');
  if (parts.length >= 3) {
    const sub = parts[0] === 'www' ? parts[1] : parts[0];
    return sub && sub !== 'www' ? sub : undefined;
  }

  return undefined;
}

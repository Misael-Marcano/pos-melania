import type { Rol } from '@pos/shared';

/** Ruta por defecto tras login según rol (sin rediseñar la pantalla de login). */
export function postLoginPath(
  rol: Rol | undefined,
  platformTenantId: number | null | undefined,
): string {
  if (rol === 'plataforma' && platformTenantId == null) return '/select-organizacion';
  if (rol === 'contador') return '/reportes';
  return '/panel';
}

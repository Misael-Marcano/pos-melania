import { AuthUser } from '@pos/shared';
import { AppError } from '../middlewares/error.middleware';
import { Tienda } from '../entities/Tienda.entity';

/** ID de organización del JWT (multi-tenant, Fase D). */
export function tenantIdOrThrow(user: AuthUser | undefined): number {
  if (!user) throw new AppError('No autenticado', 401);
  if (user.rol === 'plataforma' && (user.tenantId == null || user.tenantId === undefined)) {
    throw new AppError(
      'Envía la cabecera X-Tenant-Id con el id de la organización en la que operas',
      400,
    );
  }
  const tid = user.tenantId ?? 1;
  if (Number.isNaN(Number(tid))) throw new AppError('Sesión sin organización (tenant)', 403);
  return Number(tid);
}

/** Comprueba que el recurso pertenezca a la misma organización que el usuario. */
export function assertTenantMatch(user: AuthUser, resourceTenantId: number | null | undefined): void {
  const uid = tenantIdOrThrow(user);
  const rid = resourceTenantId == null ? null : Number(resourceTenantId);
  if (rid == null || rid !== uid) {
    throw new AppError('No tienes acceso a este recurso de otra organización', 403);
  }
}

/** Requiere relación `tienda.tenant` cargada (p. ej. `relations: ['tienda', 'tienda.tenant']`). */
export function assertTenantForTienda(user: AuthUser, tienda: Tienda | null | undefined): void {
  assertTenantMatch(user, tienda?.tenant?.id);
}

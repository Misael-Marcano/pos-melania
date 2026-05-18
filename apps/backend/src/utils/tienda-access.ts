import { AuthUser } from '@pos/shared';
import { AppError } from '../middlewares/error.middleware';

/** Admin de organización o operador de plataforma (mismo alcance de sucursal que admin). */
export function isAdmin(user: AuthUser): boolean {
  return user.rol === 'admin' || user.rol === 'plataforma';
}

/** Puede elegir sucursal o ver todas en reportes (admin, plataforma, contador). */
export function canFilterAllTiendasInReportes(user: AuthUser): boolean {
  return isAdmin(user) || user.rol === 'contador';
}

/**
 * Para usuarios no administrador: devuelve su sucursal o error.
 * Para admin devuelve `null` (sin filtro por sucursal).
 */
export function tiendaIdForUserOrThrow(user: AuthUser): number | null {
  if (isAdmin(user)) return null;
  if (user.tiendaId == null) {
    throw new AppError('Tu usuario debe tener una sucursal asignada. Contacta al administrador.', 403);
  }
  return user.tiendaId;
}

/**
 * Restringe operaciones de caja (apertura, cierre, venta ligada a sesión, resúmenes)
 * a la sucursal del usuario. Los **administradores** omiten esta comprobación y pueden
 * operar cualquier caja / sucursal.
 */
export function assertTiendaCaja(
  user: AuthUser,
  cajaTiendaId: number | null | undefined
): void {
  if (isAdmin(user)) return;
  const uid = user.tiendaId;
  if (uid == null) {
    throw new AppError('Tu usuario debe tener una sucursal asignada.', 403);
  }
  if (cajaTiendaId == null || Number(cajaTiendaId) !== uid) {
    throw new AppError('No tienes acceso a esta caja o sucursal.', 403);
  }
}

export function assertTiendaSucursalParam(user: AuthUser, tiendaIdParam: number): void {
  if (isAdmin(user)) return;
  if (user.tiendaId == null || user.tiendaId !== tiendaIdParam) {
    throw new AppError('No tienes acceso a reportes de otra sucursal.', 403);
  }
}

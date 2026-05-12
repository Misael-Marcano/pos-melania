import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant.entity';
import { AuthUser, Rol } from '@pos/shared';
import { sendError, sendFail } from '../utils/response';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ── Verifica JWT ────────────────────────────────────────────────────────────
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return sendError(res, 'Token requerido', 401);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    const isPlataforma = payload.rol === 'plataforma';

    if (isPlataforma) {
      const hdr = req.headers['x-tenant-id'];
      if (hdr !== undefined && hdr !== null && String(hdr).trim() !== '') {
        const n = Number(hdr);
        if (Number.isNaN(n) || n < 1) {
          return sendError(res, 'X-Tenant-Id inválido', 400);
        }
        const tenant = await AppDataSource.getRepository(Tenant).findOne({ where: { id: n } });
        if (!tenant?.activo) {
          return sendError(res, 'Organización no encontrada o inactiva', 404);
        }
        payload.tenantId = n;
      } else {
        payload.tenantId = undefined;
      }
    } else {
      if (payload.tenantId == null || payload.tenantId === undefined) {
        payload.tenantId = 1;
      }
      const tid = Number(payload.tenantId);
      const hdr = req.headers['x-tenant-id'];
      if (hdr !== undefined && hdr !== null && String(hdr).trim() !== '') {
        const n = Number(hdr);
        if (Number.isNaN(n) || n !== tid) {
          return sendError(res, 'X-Tenant-Id no coincide con la organización de la sesión', 403);
        }
      }
    }
    req.user = payload;
    next();
  } catch (e: unknown) {
    if (e instanceof jwt.JsonWebTokenError || e instanceof jwt.TokenExpiredError) {
      return sendError(res, 'Token inválido o expirado', 401);
    }
    console.error('[authMiddleware]', e);
    return sendFail(res, e, {
      defaultStatus: 500,
      defaultMessage: 'Error de autenticación',
    });
  }
};

// ── Guard por roles ─────────────────────────────────────────────────────────
export const roleGuard = (...roles: Rol[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'No autenticado', 401);
    if (!roles.includes(req.user.rol)) {
      return sendError(res, 'No tienes permisos para esta acción', 403);
    }
    next();
  };
};

// ── Permisos predefinidos por módulo ────────────────────────────────────────
/** Incluye `plataforma`: mismo alcance operativo que admin al usar X-Tenant-Id. */
export const canAdmin    = roleGuard('admin', 'plataforma');
export const canAdminOrSoporte = roleGuard('admin', 'soporte', 'plataforma');
export const canAll      = roleGuard('admin', 'cajero', 'soporte', 'plataforma');
export const canSell     = roleGuard('admin', 'cajero', 'plataforma');
export const canPlataforma = roleGuard('plataforma');

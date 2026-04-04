import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser, Rol } from '@pos/shared';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ── Verifica JWT ────────────────────────────────────────────────────────────
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return sendError(res, 'Token requerido', 401);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return sendError(res, 'Token inválido o expirado', 401);
  }
};

// ── Guard por roles ─────────────────────────────────────────────────────────
// Uso: router.get('/ruta', authMiddleware, roleGuard('admin', 'soporte'), ctrl)
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
export const canAdmin    = roleGuard('admin');
export const canAdminOrSoporte = roleGuard('admin', 'soporte');
export const canAll      = roleGuard('admin', 'cajero', 'soporte');
export const canSell     = roleGuard('admin', 'cajero');

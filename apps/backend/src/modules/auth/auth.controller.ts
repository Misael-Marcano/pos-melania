import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, refreshTokenSchema } from './dto/auth.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';
import { z } from 'zod';

const service = new AuthService();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(6, 'Mínimo 6 caracteres'),
});

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const dto  = loginSchema.parse(req.body);
      const raw  = req.headers['x-tenant-slug'];
      const tenantSlug = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
      const data = await service.login(dto, { tenantSlug });
      return sendSuccess(res, data, 'Inicio de sesión exitoso');
    } catch (err: unknown) {
      return sendFail(res, err, { defaultStatus: 401, defaultMessage: 'Error al iniciar sesión' });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const data = await service.refresh(refreshToken);
      return sendSuccess(res, data, 'Token renovado');
    } catch (err: unknown) {
      return sendFail(res, err, { defaultStatus: 401, defaultMessage: 'Token inválido' });
    }
  }

  async logout(req: AuthRequest, res: Response) {
    try {
      await service.logout(req.user!.id);
      return sendSuccess(res, null, 'Sesión cerrada');
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async profile(req: AuthRequest, res: Response) {
    try {
      const data = await service.getProfile(req.user!.id);
      return sendSuccess(res, data);
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      await service.changePassword(req.user!.id, currentPassword, newPassword);
      return sendSuccess(res, null, 'Contraseña actualizada. Inicia sesión nuevamente.');
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }
}

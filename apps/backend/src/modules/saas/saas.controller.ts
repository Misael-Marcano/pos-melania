import { Response } from 'express';
import { SaasService } from './saas.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';

const service = new SaasService();

export class SaasController {
  async context(req: AuthRequest, res: Response) {
    try {
      const u = req.user!;
      const jwtTid = u.rol === 'plataforma' ? u.tenantId : undefined;
      const data = await service.contextForUser(u.id, jwtTid);
      return sendSuccess(res, data);
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }
}

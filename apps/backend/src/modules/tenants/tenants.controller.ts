import { Response } from 'express';
import { TenantsService } from './tenants.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';

const service = new TenantsService();

export class TenantsController {
  /** Lista básica — para selector de organización. */
  async list(_req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.list());
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  /** Lista enriquecida con métricas — para panel de administración. */
  async listWithUsage(_req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.listWithUsage(), 'Panel de organizaciones');
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }
}

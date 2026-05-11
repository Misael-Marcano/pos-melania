import { Response } from 'express';
import { AuditoriaService } from './auditoria.service';
import { AuthRequest }      from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { tenantIdOrThrow } from '../../utils/tenant-access';

const service = new AuditoriaService();

export class AuditoriaController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const result = await service.findAll(req, tenantIdOrThrow(req.user));
      return res.json({
        success: true,
        data: result.data,
        pagination: {
          total:      result.total,
          page:       result.page,
          limit:      result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async getTablas(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getTablas(tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

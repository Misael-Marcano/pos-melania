import { Response } from 'express';
import { AuditoriaService } from './auditoria.service';
import { AuthRequest }      from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new AuditoriaService();

export class AuditoriaController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const result = await service.findAll(req);
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

  async getTablas(_req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getTablas());
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

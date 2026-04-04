import { Response } from 'express';
import { ComprobantesService } from './comprobantes.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new ComprobantesService();

export class ComprobantesController {
  async findAll(_req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findAll()); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async create(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.create(req.body), 'Comprobante creado', 201); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async update(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.update(Number(req.params.id), req.body), 'Actualizado'); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

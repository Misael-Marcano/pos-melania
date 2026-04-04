import { Response } from 'express';
import { TiendasService } from './tiendas.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new TiendasService();

export class TiendasController {
  async findAll(_req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findAll()); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async create(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.create(req.body), 'Tienda creada', 201); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async update(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.update(Number(req.params.id), req.body), 'Actualizada'); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async delete(req: AuthRequest, res: Response) {
    try { await service.delete(Number(req.params.id)); return sendSuccess(res, null, 'Eliminada'); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

import { Response } from 'express';
import { KitsService } from './kits.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new KitsService();

export class KitsController {
  async findAll(_req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findAll()); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async findById(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findById(Number(req.params.id))); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error', 404); }
  }
  async create(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.create(req.body), 'Kit creado', 201); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async update(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.update(Number(req.params.id), req.body), 'Kit actualizado'); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async delete(req: AuthRequest, res: Response) {
    try { await service.delete(Number(req.params.id)); return sendSuccess(res, null, 'Kit eliminado'); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

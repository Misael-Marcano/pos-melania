import { Response } from 'express';
import { KitsService } from './kits.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';

const service = new KitsService();

export class KitsController {
  async findAll(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findAll(req.user!)); }
    catch (e: unknown) { return sendFail(res, e); }
  }
  async findById(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findById(Number(req.params.id), req.user!)); }
    catch (e: unknown) { return sendFail(res, e, { defaultStatus: 404 }); }
  }
  async create(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.create(req.body, req.user!), 'Kit creado', 201); }
    catch (e: unknown) { return sendFail(res, e); }
  }
  async update(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.update(Number(req.params.id), req.body, req.user!), 'Kit actualizado'); }
    catch (e: unknown) { return sendFail(res, e); }
  }
  async delete(req: AuthRequest, res: Response) {
    try { await service.delete(Number(req.params.id), req.user!); return sendSuccess(res, null, 'Kit eliminado'); }
    catch (e: unknown) { return sendFail(res, e); }
  }
}

import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { PromocionesService } from './promociones.service';
import { sendSuccess, sendError } from '../../utils/response';
import { registrarAudit } from '../auditoria/auditoria.service';

const service = new PromocionesService();

export class PromocionesController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const q = req.query.q as string | undefined;
      return sendSuccess(res, await service.findAll(q));
    } catch (e: unknown) { return sendError(res, e); }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id)));
    } catch (e: unknown) { return sendError(res, e); }
  }

  async validar(req: AuthRequest, res: Response) {
    try {
      const { codigo, total } = req.body;
      const result = await service.validar(String(codigo), Number(total));
      return sendSuccess(res, result);
    } catch (e: unknown) { return sendError(res, e); }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const p = await service.create(req.body);
      await registrarAudit(req.user!.id, 'CREATE', 'Promocion', p.id, null, p);
      return sendSuccess(res, p, 201);
    } catch (e: unknown) { return sendError(res, e); }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const antes = await service.findById(Number(req.params.id));
      const p = await service.update(Number(req.params.id), req.body);
      await registrarAudit(req.user!.id, 'UPDATE', 'Promocion', p.id, antes, p);
      return sendSuccess(res, p);
    } catch (e: unknown) { return sendError(res, e); }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await service.delete(Number(req.params.id));
      await registrarAudit(req.user!.id, 'DELETE', 'Promocion', Number(req.params.id), null, null);
      return sendSuccess(res, { ok: true });
    } catch (e: unknown) { return sendError(res, e); }
  }
}

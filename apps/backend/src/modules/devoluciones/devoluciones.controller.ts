import { Response } from 'express';
import { DevolucionesService } from './devoluciones.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';

const service = new DevolucionesService();

export class DevolucionesController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const { estado } = req.query as { estado?: string };
      return sendSuccess(res, await service.findAll(req.user!, estado));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id), req.user!));
    } catch (e: unknown) { return sendFail(res, e, { defaultStatus: 404 }); }
  }

  async findByVenta(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findByVenta(Number(req.params.ventaId), req.user!));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dev = await service.create(req.body, req.user!);
      return sendSuccess(res, dev, 'Devolución registrada', 201);
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async aprobar(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.aprobar(Number(req.params.id), req.user!), 'Devolución aprobada');
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async rechazar(req: AuthRequest, res: Response) {
    try {
      const { motivo } = req.body as { motivo?: string };
      return sendSuccess(res, await service.rechazar(Number(req.params.id), req.user!, motivo), 'Devolución rechazada');
    } catch (e: unknown) { return sendFail(res, e); }
  }
}

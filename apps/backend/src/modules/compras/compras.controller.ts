import { Response } from 'express';
import { ComprasService } from './compras.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new ComprasService();

export class ComprasController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const { estado } = req.query as { estado?: string };
      return sendSuccess(res, await service.findAll(estado));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id)));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error', 404); }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const orden = await service.create(req.body, req.user!.id);
      return sendSuccess(res, orden, 'Orden de compra creada', 201);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.update(Number(req.params.id), req.body), 'Orden actualizada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async enviar(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.cambiarEstado(Number(req.params.id), 'ENVIADA'), 'Orden enviada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async recibir(req: AuthRequest, res: Response) {
    try {
      const { recepciones } = req.body as { recepciones: { detalleId: number; cantidadRecibida: number }[] };
      return sendSuccess(res, await service.recibirOrden(Number(req.params.id), recepciones), 'Recepción registrada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async cancelar(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.cancelar(Number(req.params.id)), 'Orden cancelada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { PromocionesService } from './promociones.service';
import { sendSuccess, sendError } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new PromocionesService();

export class PromocionesController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const q = req.query.q as string | undefined;
      return sendSuccess(res, await service.findAll(q, req.user!));
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id), req.user!));
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error', 404);
    }
  }

  async validar(req: AuthRequest, res: Response) {
    try {
      const { codigo, total } = req.body;
      const result = await service.validar(String(codigo), Number(total), req.user!);
      return sendSuccess(res, result);
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const p = await service.create(req.body, req.user!);
      await registrarAudit({
        tabla: 'promociones',
        operacion: 'CREATE',
        registroId: p.id,
        descripcion: `Creó promoción ${p.codigo}`,
        valorNuevo: p as object,
        usuarioId: req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip: req.ip,
      });
      return sendSuccess(res, p, 'Promoción creada', 201);
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const antes = await service.findById(id, req.user!);
      const p = await service.update(id, req.body, req.user!);
      await registrarAudit({
        tabla: 'promociones',
        operacion: 'UPDATE',
        registroId: p.id,
        descripcion: `Actualizó promoción ${p.codigo}`,
        valorAnterior: antes as object,
        valorNuevo: p as object,
        usuarioId: req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip: req.ip,
      });
      return sendSuccess(res, p, 'Promoción actualizada');
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.delete(id, req.user!);
      await registrarAudit({
        tabla: 'promociones',
        operacion: 'DELETE',
        registroId: id,
        descripcion: `Desactivó promoción #${id}`,
        usuarioId: req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip: req.ip,
      });
      return sendSuccess(res, { ok: true }, 'Promoción desactivada');
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }
}

import { Response } from 'express';
import { ComprobantesService } from './comprobantes.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new ComprobantesService();

export class ComprobantesController {
  async findAll(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findAll(req.user!)); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const data = await service.create(req.body, req.user!);
      registrarAudit({
        tabla:         'comprobantes',
        operacion:     'CREATE',
        registroId:    data.id,
        descripcion:   `Creó serie fiscal ${data.tipo} (${data.descripcion})`,
        valorNuevo:    data,
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Comprobante creado', 201);
    }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const prev = await service.findById(id, req.user!);
      const data = await service.update(id, req.body, req.user!);
      registrarAudit({
        tabla:         'comprobantes',
        operacion:     'UPDATE',
        registroId:    id,
        descripcion:   `Actualizó serie fiscal ${prev.tipo} (${prev.descripcion})`,
        valorAnterior: prev,
        valorNuevo:    data,
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Actualizado');
    }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

import { Response } from 'express';
import { TiendasService } from './tiendas.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new TiendasService();

export class TiendasController {
  async findAll(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.findAll(req.user!)); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async create(req: AuthRequest, res: Response) {
    try {
      const data = await service.create(req.body, req.user!);
      registrarAudit({
        tabla:         'tiendas',
        operacion:     'CREATE',
        registroId:    data.id,
        descripcion:   `Creó sucursal "${data.nombre}" (#${data.id})`,
        valorNuevo:    { id: data.id, nombre: data.nombre, activo: data.activo },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Tienda creada', 201);
    }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const prev = await service.findById(id, req.user!);
      const data = await service.update(id, req.body, req.user!);
      registrarAudit({
        tabla:         'tiendas',
        operacion:     'UPDATE',
        registroId:    id,
        descripcion:   `Actualizó sucursal "${data.nombre}" (#${id})`,
        valorAnterior: { nombre: prev.nombre, activo: prev.activo },
        valorNuevo:    { nombre: data.nombre, activo: data.activo },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Actualizada');
    }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async delete(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const prev = await service.findById(id, req.user!);
      await service.delete(id, req.user!);
      registrarAudit({
        tabla:         'tiendas',
        operacion:     'DELETE',
        registroId:    id,
        descripcion:   `Desactivó sucursal "${prev.nombre}" (#${id})`,
        valorAnterior: { nombre: prev.nombre, activo: prev.activo },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, null, 'Eliminada');
    }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

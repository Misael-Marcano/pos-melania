import { Response } from 'express';
import { CajasService } from './cajas.service';
import { createCajaSchema, updateCajaSchema } from './cajas.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new CajasService();

export class CajasController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const tiendaId = req.query.tiendaId ? Number(req.query.tiendaId) : undefined;
      return sendSuccess(res, await service.findAll(tiendaId, req.user!));
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id), req.user!));
    } catch (e: unknown) {
      return sendFail(res, e, { defaultStatus: 404 });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto = createCajaSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      registrarAudit({
        tabla:         'cajas',
        operacion:     'CREATE',
        registroId:    data.id,
        descripcion:   `Creó caja de catálogo "${data.nombre}" (sucursal ID ${data.tienda?.id ?? '—'})`,
        valorNuevo:    { nombre: data.nombre, tiendaId: dto.tiendaId, activo: data.activo },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Caja creada', 201);
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id  = Number(req.params.id);
      const dto = updateCajaSchema.parse(req.body);
      const prev = await service.findById(id, req.user!);
      const data = await service.update(id, dto, req.user!);
      registrarAudit({
        tabla:         'cajas',
        operacion:     'UPDATE',
        registroId:    id,
        descripcion:   `Actualizó caja "${data.nombre}" (#${id})`,
        valorAnterior: { nombre: prev.nombre, activo: prev.activo, tiendaId: prev.tienda?.id },
        valorNuevo:    { nombre: data.nombre, activo: data.activo, tiendaId: data.tienda?.id },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Caja actualizada');
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const prev = await service.findById(id, req.user!);
      await service.delete(id, req.user!);
      registrarAudit({
        tabla:         'cajas',
        operacion:     'DELETE',
        registroId:    id,
        descripcion:   `Desactivó caja "${prev.nombre}" (#${id})`,
        valorAnterior: { nombre: prev.nombre, activo: prev.activo },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, null, 'Caja desactivada');
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }
}

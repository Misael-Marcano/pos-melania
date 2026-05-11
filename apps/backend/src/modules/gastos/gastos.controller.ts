import { Response } from 'express';
import { GastosService } from './gastos.service';
import { createGastoSchema, updateGastoSchema } from './dto/gastos.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new GastosService();

export class GastosController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const { data, total, page, limit } = await service.findAll(req);
      return sendPaginated(res, data, total, page, limit);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      const data = await service.findById(Number(req.params.id), req.user!);
      return sendSuccess(res, data);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error', 404);
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createGastoSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      registrarAudit({ tabla: 'gastos', operacion: 'CREATE', registroId: data.id, descripcion: `Registró gasto "${data.escribe}" por RD$${data.cantidad}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Gasto registrado', 201);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const dto  = updateGastoSchema.parse(req.body);
      const data = await service.update(Number(req.params.id), dto, req.user!);
      registrarAudit({ tabla: 'gastos', operacion: 'UPDATE', registroId: data.id, descripcion: `Actualizó gasto "${data.escribe}"`, valorNuevo: data, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Gasto actualizado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.delete(id, req.user!);
      registrarAudit({ tabla: 'gastos', operacion: 'DELETE', registroId: id, descripcion: `Eliminó gasto #${id}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, null, 'Gasto eliminado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }
}

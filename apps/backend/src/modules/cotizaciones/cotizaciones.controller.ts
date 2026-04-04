import { Response } from 'express';
import { CotizacionesService } from './cotizaciones.service';
import {
  createCotizacionSchema,
  updateCotizacionSchema,
  cambiarEstadoSchema,
} from './dto/cotizaciones.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new CotizacionesService();

export class CotizacionesController {

  async findAll(req: AuthRequest, res: Response) {
    try {
      const { data, total, page, limit } = await service.findAll(req);
      return sendPaginated(res, data, total, page, limit);
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id)));
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error', 404);
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createCotizacionSchema.parse(req.body);
      const data = await service.create(dto, req.user!.id);
      registrarAudit({
        tabla: 'cotizaciones', operacion: 'CREATE', registroId: data.id,
        descripcion: `Creó cotización #${data.id} por RD$${data.total}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, 'Cotización creada exitosamente', 201);
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error al crear cotización');
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = updateCotizacionSchema.parse(req.body);
      const data = await service.update(id, dto);
      registrarAudit({
        tabla: 'cotizaciones', operacion: 'UPDATE', registroId: id,
        descripcion: `Editó cotización #${id}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, 'Cotización actualizada');
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async cambiarEstado(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = cambiarEstadoSchema.parse(req.body);
      const data = await service.cambiarEstado(id, dto);
      registrarAudit({
        tabla: 'cotizaciones', operacion: 'UPDATE', registroId: id,
        descripcion: `Cambió estado de cotización #${id} a ${dto.estado}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, `Estado cambiado a ${dto.estado}`);
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async convertirAVenta(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const data = await service.convertirAVenta(id, req.user!);
      registrarAudit({
        tabla: 'cotizaciones', operacion: 'UPDATE', registroId: id,
        descripcion: `Convirtió cotización #${id} a venta #${data.id}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, `Cotización convertida a venta #${data.id}`, 201);
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.delete(id);
      registrarAudit({
        tabla: 'cotizaciones', operacion: 'DELETE', registroId: id,
        descripcion: `Eliminó cotización #${id}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, null, 'Cotización eliminada');
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async checkVencidas(_req: AuthRequest, res: Response) {
    try {
      const count = await service.checkVencidas();
      return sendSuccess(res, { actualizadas: count }, `${count} cotización(es) marcadas como vencidas`);
    } catch (e: unknown) {
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }
}

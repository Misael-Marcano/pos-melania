import { Response } from 'express';
import { TarjetasRegaloService } from './tarjetas-regalo.service';
import {
  createTarjetaSchema, recargarTarjetaSchema,
  usarTarjetaSchema, updateTarjetaSchema,
} from './dto/tarjetas-regalo.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new TarjetasRegaloService();

export class TarjetasRegaloController {
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
      const data = await service.findById(Number(req.params.id));
      return sendSuccess(res, data);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error', 404);
    }
  }

  async findByCodigo(req: AuthRequest, res: Response) {
    try {
      const data = await service.findByCodigo(req.params.codigo);
      return sendSuccess(res, data);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error', 404);
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createTarjetaSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      registrarAudit({
        tabla: 'tarjetas_regalo', operacion: 'CREATE', registroId: data.id,
        descripcion: `Creó tarjeta ${data.codigo} con saldo RD$${data.saldoInicial}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, 'Tarjeta de regalo creada', 201);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async recargar(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = recargarTarjetaSchema.parse(req.body);
      const data = await service.recargar(id, dto);
      registrarAudit({
        tabla: 'tarjetas_regalo', operacion: 'UPDATE', registroId: id,
        descripcion: `Recargó tarjeta ${data.codigo} con RD$${dto.monto}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, 'Tarjeta recargada');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async usar(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = usarTarjetaSchema.parse(req.body);
      const data = await service.usar(id, dto);
      registrarAudit({
        tabla: 'tarjetas_regalo', operacion: 'UPDATE', registroId: id,
        descripcion: `Usó RD$${dto.monto} de tarjeta ${data.codigo}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, 'Pago con tarjeta procesado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = updateTarjetaSchema.parse(req.body);
      const data = await service.update(id, dto);
      registrarAudit({
        tabla: 'tarjetas_regalo', operacion: 'UPDATE', registroId: id,
        descripcion: `Actualizó tarjeta ${data.codigo}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, data, 'Tarjeta actualizada');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.delete(id);
      registrarAudit({
        tabla: 'tarjetas_regalo', operacion: 'DELETE', registroId: id,
        descripcion: `Eliminó tarjeta #${id}`,
        usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip,
      });
      return sendSuccess(res, null, 'Tarjeta eliminada');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }
}

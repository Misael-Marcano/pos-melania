import { Response } from 'express';
import { ClientesService } from './clientes.service';
import { createClienteSchema, updateClienteSchema } from './dto/cliente.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail, sendPaginated } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';
import { Cliente } from '../../entities/Cliente.entity';

const service = new ClientesService();

function snapshotClienteAudit(c: Cliente) {
  return {
    nombre:             c.nombre,
    correo:             c.correo ?? null,
    telefono:           c.telefono ?? null,
    compania:           c.compania ?? null,
    tipoIdentificacion: c.tipoIdentificacion ?? null,
    activo:             c.activo,
  };
}

export class ClientesController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const { data, total, page, limit } = await service.findAll(req);
      return sendPaginated(res, data, total, page, limit);
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      const data = await service.findById(Number(req.params.id), req.user!);
      return sendSuccess(res, data);
    } catch (err: unknown) {
      return sendFail(res, err, { defaultStatus: 404 });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createClienteSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      const correoLabel = data.correo ? ` (${data.correo})` : '';
      registrarAudit({
        tabla:         'clientes',
        operacion:     'CREATE',
        registroId:    data.id,
        descripcion:   `Creó cliente "${data.nombre}"${correoLabel}`,
        valorNuevo:    { id: data.id, ...snapshotClienteAudit(data) },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Cliente creado', 201);
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = updateClienteSchema.parse(req.body);
      const prev = await service.findById(id, req.user!);
      const data = await service.update(id, dto, req.user!);
      registrarAudit({
        tabla:         'clientes',
        operacion:     'UPDATE',
        registroId:    id,
        descripcion:   `Actualizó cliente "${data.nombre}" (#${id})`,
        valorAnterior: snapshotClienteAudit(prev),
        valorNuevo:    {
          ...snapshotClienteAudit(data),
          identificacionActualizada: Boolean(
            dto.numeroIdentificacion !== undefined || dto.tipoIdentificacion !== undefined,
          ),
        },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Cliente actualizado');
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const prev = await service.findById(id, req.user!);
      await service.delete(id, req.user!);
      registrarAudit({
        tabla:         'clientes',
        operacion:     'DELETE',
        registroId:    id,
        descripcion:   `Desactivó cliente "${prev.nombre}" (#${id})`,
        valorAnterior: snapshotClienteAudit(prev),
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, null, 'Cliente eliminado');
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async getHistorial(req: AuthRequest, res: Response) {
    try {
      const data = await service.getHistorialVentas(Number(req.params.id), req.user!);
      return sendSuccess(res, data);
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async getEstadoCuenta(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getEstadoCuenta(Number(req.params.id), req.user!));
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async registrarAbono(req: AuthRequest, res: Response) {
    try {
      const { monto, notas } = req.body as { monto: number; notas?: string };
      const result = await service.registrarAbono(Number(req.params.id), monto, notas, req.user!.id, req.user!);
      return sendSuccess(res, result, 'Pago registrado');
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async getConSaldo(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getClientesConSaldo(req.user!));
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }
}

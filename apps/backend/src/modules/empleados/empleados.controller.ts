import { Response } from 'express';
import { EmpleadosService } from './empleados.service';
import { createEmpleadoSchema, updateEmpleadoSchema } from './dto/empleados.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new EmpleadosService();

export class EmpleadosController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findAll(req.user!));
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id), req.user!));
    } catch (err: unknown) {
      return sendFail(res, err, { defaultStatus: 404 });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createEmpleadoSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      registrarAudit({
        tabla:         'empleados',
        operacion:     'CREATE',
        registroId:    data.id,
        descripcion:   `Creó empleado "${data.nombre}" (${data.correo}) · rol ${data.rol}`,
        valorNuevo:    { id: data.id, nombre: data.nombre, correo: data.correo, rol: data.rol },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Empleado creado', 201);
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = updateEmpleadoSchema.parse(req.body);
      const prev = await service.findById(id, req.user!);
      const data = await service.update(id, dto, req.user!);
      registrarAudit({
        tabla:         'empleados',
        operacion:     'UPDATE',
        registroId:    id,
        descripcion:   `Actualizó empleado "${data.nombre}" (#${id})`,
        valorAnterior: { nombre: prev.nombre, correo: prev.correo, rol: prev.rol, activo: prev.activo },
        valorNuevo:    {
          nombre: data.nombre,
          correo: data.correo,
          rol:    data.rol,
          activo: data.activo,
          passwordCambiado: Boolean(dto.password),
        },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Empleado actualizado');
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
        tabla:         'empleados',
        operacion:     'DELETE',
        registroId:    id,
        descripcion:   `Desactivó empleado "${prev.nombre}" (#${id})`,
        valorAnterior: { nombre: prev.nombre, correo: prev.correo, rol: prev.rol, activo: prev.activo },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, null, 'Empleado eliminado');
    } catch (err: unknown) {
      return sendFail(res, err);
    }
  }
}

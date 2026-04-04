import { Response } from 'express';
import { EmpleadosService } from './empleados.service';
import { createEmpleadoSchema, updateEmpleadoSchema } from './dto/empleados.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new EmpleadosService();

export class EmpleadosController {
  async findAll(_req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findAll());
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id)));
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error', 404);
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createEmpleadoSchema.parse(req.body);
      const data = await service.create(dto);
      return sendSuccess(res, data, 'Empleado creado', 201);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const dto  = updateEmpleadoSchema.parse(req.body);
      const data = await service.update(Number(req.params.id), dto);
      return sendSuccess(res, data, 'Empleado actualizado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await service.delete(Number(req.params.id));
      return sendSuccess(res, null, 'Empleado eliminado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }
}

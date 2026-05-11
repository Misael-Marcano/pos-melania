import { Response } from 'express';
import { ClientesService } from './clientes.service';
import { createClienteSchema, updateClienteSchema } from './dto/cliente.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';

const service = new ClientesService();

export class ClientesController {
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
      const dto  = createClienteSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      return sendSuccess(res, data, 'Cliente creado', 201);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const dto  = updateClienteSchema.parse(req.body);
      const data = await service.update(Number(req.params.id), dto, req.user!);
      return sendSuccess(res, data, 'Cliente actualizado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await service.delete(Number(req.params.id), req.user!);
      return sendSuccess(res, null, 'Cliente eliminado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async getHistorial(req: AuthRequest, res: Response) {
    try {
      const data = await service.getHistorialVentas(Number(req.params.id), req.user!);
      return sendSuccess(res, data);
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async getEstadoCuenta(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getEstadoCuenta(Number(req.params.id), req.user!));
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async registrarAbono(req: AuthRequest, res: Response) {
    try {
      const { monto, notas } = req.body as { monto: number; notas?: string };
      const result = await service.registrarAbono(Number(req.params.id), monto, notas, req.user!.id, req.user!);
      return sendSuccess(res, result, 'Pago registrado');
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }

  async getConSaldo(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getClientesConSaldo(req.user!));
    } catch (err: unknown) {
      return sendError(res, err instanceof Error ? err.message : 'Error');
    }
  }
}

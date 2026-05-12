import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';
import { RecetasService } from './recetas.service';
import { createRecetaSchema, updateRecetaSchema, producirRecetaSchema } from './dto/recetas.dto';

const service = new RecetasService();

export class RecetasController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findAll(req.user!));
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
      const dto = createRecetaSchema.parse(req.body);
      return sendSuccess(res, await service.create(dto, req.user!), 'Receta creada', 201);
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const dto = updateRecetaSchema.parse(req.body);
      return sendSuccess(res, await service.update(Number(req.params.id), dto, req.user!), 'Receta actualizada');
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await service.delete(Number(req.params.id), req.user!);
      return sendSuccess(res, null, 'Receta desactivada');
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  async producir(req: AuthRequest, res: Response) {
    try {
      const { lotes } = producirRecetaSchema.parse(req.body);
      const result = await service.producir(Number(req.params.id), lotes, req.user!.id, req.user!);
      return sendSuccess(res, result);
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }
}

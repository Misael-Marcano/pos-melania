import { Response } from 'express';
import { ConfiguracionService } from './configuracion.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new ConfiguracionService();

export class ConfiguracionController {
  async get(_req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.get()); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async update(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.update(req.body), 'Configuración guardada'); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

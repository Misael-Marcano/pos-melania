import { Response } from 'express';
import { ConfiguracionService } from './configuracion.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new ConfiguracionService();

export class ConfiguracionController {
  async get(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.get(req.user!)); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
  async update(req: AuthRequest, res: Response) {
    try {
      const prev = await service.get(req.user!);
      const data = await service.update(req.user!, req.body);
      registrarAudit({
        tabla:         'configuracion',
        operacion:     'UPDATE',
        registroId:    data.id,
        descripcion:   'Actualizó configuración general del sistema',
        valorAnterior: prev,
        valorNuevo:    data,
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Configuración guardada');
    }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}

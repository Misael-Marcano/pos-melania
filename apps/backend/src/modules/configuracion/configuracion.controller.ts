import { Response } from 'express';
import { ZodError } from 'zod';
import { ConfiguracionService } from './configuracion.service';
import { updateConfiguracionSchema } from './dto/configuracion.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new ConfiguracionService();

function formatZodMessage(e: ZodError): string {
  const first = e.issues[0];
  if (!first) return 'Datos inválidos';
  const path = first.path.length ? `${first.path.join('.')}: ` : '';
  return `${path}${first.message}`;
}

export class ConfiguracionController {
  async get(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.get(req.user!)); }
    catch (e: unknown) { return sendFail(res, e); }
  }
  async update(req: AuthRequest, res: Response) {
    try {
      const dto = updateConfiguracionSchema.parse(req.body);
      const prev = await service.get(req.user!);
      const data = await service.update(req.user!, dto);
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
    catch (e: unknown) {
      if (e instanceof ZodError) {
        return sendFail(res, new Error(formatZodMessage(e)), { defaultStatus: 400 });
      }
      return sendFail(res, e);
    }
  }
}

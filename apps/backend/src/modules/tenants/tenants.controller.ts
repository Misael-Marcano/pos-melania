import { Response } from 'express';
import { z } from 'zod';
import { TenantsService } from './tenants.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new TenantsService();

export class TenantsController {
  /** Lista básica — para selector de organización. */
  async list(_req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.list());
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  /** Lista enriquecida con métricas — para panel de administración. */
  async listWithUsage(_req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.listWithUsage(), 'Panel de organizaciones');
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }

  /** Auditoría al pulsar «Operar» en `/plataforma` (contexto de soporte). */
  async operate(req: AuthRequest, res: Response) {
    try {
      const tenantId = z.coerce.number().int().positive().parse(req.params.id);
      const tenant = await service.getForOperate(tenantId);
      await registrarAudit({
        tabla:         'tenants',
        operacion:     'READ',
        registroId:    tenant.id,
        descripcion:   `Plataforma operó en contexto de «${tenant.nombre}» (id ${tenant.id})`,
        valorNuevo:    { slug: tenant.slug, activo: tenant.activo },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, { id: tenant.id, nombre: tenant.nombre }, 'Contexto de organización registrado');
    } catch (e: unknown) {
      return sendFail(res, e);
    }
  }
}

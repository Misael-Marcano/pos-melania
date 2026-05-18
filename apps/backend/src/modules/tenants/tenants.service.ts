import { AppDataSource } from '../../config/database';
import { Tenant } from '../../entities/Tenant.entity';
import { AppError } from '../../middlewares/error.middleware';
import { resolvePlanLimits } from '../../saas/plan-limits';
import { fetchTenantPanelUsageMaps, pickUsage } from '../../saas/tenant-panel-usage-batch';
import { parseTenantPanelList, type TenantPanelRowDto } from './dto/tenant-panel.dto';

const repo = () => AppDataSource.getRepository(Tenant);

export type TenantSummary = TenantPanelRowDto;

export class TenantsService {
  /** Lista básica para selector de organización (rol plataforma). */
  async list(): Promise<Pick<TenantSummary, 'id' | 'nombre' | 'slug' | 'activo'>[]> {
    return repo().find({
      where: { activo: true },
      order: { nombre: 'ASC' },
      select: ['id', 'nombre', 'slug', 'activo'],
    });
  }

  /**
   * Lista enriquecida con métricas de uso y facturación.
   * Solo para el panel de administración del rol `plataforma`.
   */
  async listWithUsage(): Promise<TenantSummary[]> {
    const [tenants, usageMaps] = await Promise.all([
      repo().find({ order: { nombre: 'ASC' } }),
      fetchTenantPanelUsageMaps(),
    ]);

    const rows = tenants.map((t): TenantSummary => {
      const limits = resolvePlanLimits(t.planCode);
      return {
        id:                   t.id,
        nombre:               t.nombre,
        slug:                 t.slug,
        activo:               t.activo,
        planCode:             t.planCode,
        planLabel:            limits.label,
        billingStatus:        t.billingStatus ?? null,
        stripeCustomerId:     t.stripeCustomerId ?? null,
          stripeSubscriptionId: t.stripeSubscriptionId ?? null,
          trialEndsAt:          t.trialEndsAt ?? null,
          usage:                pickUsage(usageMaps, t.id),
        limits: {
          maxUsers:     limits.maxUsers,
          maxTiendas:   limits.maxTiendas,
          maxArticulos: limits.maxArticulos,
        },
        createdAt: t.createdAt,
      };
    });

    return parseTenantPanelList(rows);
  }

  /** Registra que soporte plataforma entró a operar en una organización (auditoría). */
  async getForOperate(tenantId: number): Promise<Pick<Tenant, 'id' | 'nombre' | 'slug' | 'activo'>> {
    const tenant = await repo().findOne({
      where: { id: tenantId },
      select: ['id', 'nombre', 'slug', 'activo'],
    });
    if (!tenant) throw new AppError('Organización no encontrada', 404);
    return tenant;
  }
}

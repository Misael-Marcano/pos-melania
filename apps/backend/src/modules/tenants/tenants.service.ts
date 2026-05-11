import { AppDataSource } from '../../config/database';
import { Tenant } from '../../entities/Tenant.entity';
import { resolvePlanLimits } from '../../saas/plan-limits';
import {
  countSeatsForTenant,
  countTiendasActivasForTenant,
  countArticulosActivosForTenant,
} from '../../saas/tenant-usage';

const repo = () => AppDataSource.getRepository(Tenant);

export interface TenantSummary {
  id:                   number;
  nombre:               string;
  slug:                 string;
  activo:               boolean;
  planCode:             string;
  planLabel:            string;
  billingStatus:        string | null;
  stripeCustomerId:     string | null;
  stripeSubscriptionId: string | null;
  usage: {
    seats:            number;
    tiendasActivas:   number;
    articulosActivos: number;
  };
  limits: {
    maxUsers:     number | null;
    maxTiendas:   number | null;
    maxArticulos: number | null;
  };
  createdAt: Date;
}

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
    const tenants = await repo().find({ order: { nombre: 'ASC' } });

    const summaries = await Promise.all(
      tenants.map(async (t): Promise<TenantSummary> => {
        const [seats, tiendasActivas, articulosActivos] = await Promise.all([
          countSeatsForTenant(t.id),
          countTiendasActivasForTenant(t.id),
          countArticulosActivosForTenant(t.id),
        ]);
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
          usage:  { seats, tiendasActivas, articulosActivos },
          limits: {
            maxUsers:     limits.maxUsers,
            maxTiendas:   limits.maxTiendas,
            maxArticulos: limits.maxArticulos,
          },
          createdAt: t.createdAt,
        };
      }),
    );

    return summaries;
  }
}

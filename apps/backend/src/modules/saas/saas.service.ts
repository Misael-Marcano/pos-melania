import { AppDataSource } from '../../config/database';
import { Usuario } from '../../entities/Usuario.entity';
import { Tenant } from '../../entities/Tenant.entity';
import { AppError } from '../../middlewares/error.middleware';
import { resolvePlanLimits } from '../../saas/plan-limits';
import {
  countSeatsForTenant,
  countTiendasActivasForTenant,
  countArticulosActivosForTenant,
  countVentasMesActualForTenant,
} from '../../saas/tenant-usage';
import { trialStateFromEndsAt } from '../../saas/trial';

const repo = () => AppDataSource.getRepository(Usuario);
const tenantRepo = () => AppDataSource.getRepository(Tenant);

export class SaasService {
  /**
   * Contexto plan/tenant para UI y topes por organización.
   * Rol `plataforma`: usa la org efectiva del JWT (`X-Tenant-Id`); si no hay, la del usuario en BD.
   */
  async contextForUser(userId: number, jwtTenantId?: number | null) {
    const user = await repo().findOne({
      where: { id: userId },
      relations: ['tenant'],
    });
    if (!user?.tenant) throw new AppError('Usuario sin organización', 400);

    let tenant: Tenant = user.tenant;

    if (user.rol === 'plataforma' && jwtTenantId != null && jwtTenantId > 0) {
      const t = await tenantRepo().findOne({ where: { id: jwtTenantId, activo: true } });
      if (!t) throw new AppError('Organización no encontrada', 404);
      tenant = t;
    }

    return await this.buildContext(tenant);
  }

  private async buildContext(t: Tenant) {
    const planCode = t.planCode ?? 'standard';
    const limits = resolvePlanLimits(planCode);
    const [seats, tiendasActivas, articulosActivos, ventasMesActual] = await Promise.all([
      countSeatsForTenant(t.id),
      countTiendasActivasForTenant(t.id),
      countArticulosActivosForTenant(t.id),
      countVentasMesActualForTenant(t.id),
    ]);

    /**
     * `needsOnboarding` = true cuando Stripe está configurado pero el tenant
     * todavía no tiene cliente/suscripción en Stripe. Se usa para mostrar el
     * banner de provisioning guiado en el dashboard.
     */
    const needsOnboarding =
      process.env.BILLING_PROVIDER !== 'none' &&
      Boolean(process.env.STRIPE_SECRET_KEY?.trim()) &&
      !t.stripeCustomerId?.trim();

    const trial = trialStateFromEndsAt(t.trialEndsAt ?? null);

    return {
      tenant: {
        id:       t.id,
        nombre:   t.nombre,
        slug:     t.slug,
        planCode,
        activo:   t.activo,
      },
      limits,
      usage: {
        seats,
        tiendasActivas,
        articulosActivos,
        ventasMesActual,
      },
      needsOnboarding,
      trial: {
        endsAt:        trial.endsAt,
        active:        trial.active,
        expired:       trial.expired,
        daysRemaining: trial.daysRemaining,
      },
    };
  }
}

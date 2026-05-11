import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant.entity';
import { AppError } from '../middlewares/error.middleware';
import { resolvePlanLimits, PlanFeatures } from './plan-limits';
import {
  countSeatsForTenant,
  countTiendasActivasForTenant,
  countArticulosActivosForTenant,
} from './tenant-usage';

const tenantRepo = () => AppDataSource.getRepository(Tenant);

// ── Helpers internos ──────────────────────────────────────────────────────────

async function getTenantOrThrow(tenantId: number): Promise<Tenant> {
  const tenant = await tenantRepo().findOne({ where: { id: tenantId } });
  if (!tenant) throw new AppError('Organización no encontrada', 404);
  return tenant;
}

// ── Límites cuantitativos ─────────────────────────────────────────────────────

/**
 * Antes de crear un usuario de acceso (empleado), comprueba tope del plan del tenant.
 */
export async function assertTenantCanAddUsuario(tenantId: number): Promise<void> {
  const tenant = await getTenantOrThrow(tenantId);
  const { maxUsers, label } = resolvePlanLimits(tenant.planCode);
  if (maxUsers == null) return;
  const n = await countSeatsForTenant(tenantId);
  if (n >= maxUsers) {
    throw new AppError(
      `Límite de usuarios del plan ${label} (${maxUsers}). Actualiza el plan o desactiva usuarios que no uses.`,
      403,
    );
  }
}

/**
 * Antes de crear una sucursal, comprueba tope del plan del tenant.
 */
export async function assertTenantCanAddTienda(tenantId: number): Promise<void> {
  const tenant = await getTenantOrThrow(tenantId);
  const { maxTiendas, label } = resolvePlanLimits(tenant.planCode);
  if (maxTiendas == null) return;
  const n = await countTiendasActivasForTenant(tenantId);
  if (n >= maxTiendas) {
    throw new AppError(
      `Límite de sucursales del plan ${label} (${maxTiendas}). Actualiza el plan o desactiva sucursales que no uses.`,
      403,
    );
  }
}

/**
 * Antes de crear un artículo, comprueba tope de catálogo del plan del tenant.
 */
export async function assertTenantCanAddArticulo(tenantId: number): Promise<void> {
  const tenant = await getTenantOrThrow(tenantId);
  const { maxArticulos, label } = resolvePlanLimits(tenant.planCode);
  if (maxArticulos == null) return;
  const n = await countArticulosActivosForTenant(tenantId);
  if (n >= maxArticulos) {
    throw new AppError(
      `Límite de artículos del plan ${label} (${maxArticulos}). Actualiza el plan o desactiva artículos que no uses.`,
      403,
    );
  }
}

// ── Feature flags ─────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  kits:           'Kits',
  cotizaciones:   'Cotizaciones',
  promociones:    'Promociones',
  tarjetasRegalo: 'Tarjetas de regalo',
  recetas:        'Recetas',
  compras:        'Compras / proveedores',
};

/**
 * Lanza `403` si el feature no está habilitado en el plan del tenant.
 * Usar al inicio del método `create` de cada módulo bloqueado en Starter.
 */
export async function assertFeatureEnabled(
  tenantId: number,
  feature: keyof PlanFeatures,
): Promise<void> {
  const tenant = await getTenantOrThrow(tenantId);
  const { features, label } = resolvePlanLimits(tenant.planCode);
  if (!features[feature]) {
    throw new AppError(
      `El módulo "${FEATURE_LABELS[feature]}" no está disponible en el plan ${label}. Actualiza tu suscripción en Configuración → Plan.`,
      403,
    );
  }
}

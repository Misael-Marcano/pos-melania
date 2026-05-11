/**
 * Límites declarativos por plan (producto SaaS). Las altas sensibles se validan en
 * `enforce-plan.ts`; la facturación real queda fuera.
 *
 * ── Planes ────────────────────────────────────────────────────────────────────
 * starter    $29/mo  Negocio pequeño, 1 local, propietario + cajeros.
 *                    Módulos core: ventas, inventario, gastos, clientes, cajas.
 * standard   $79/mo  Multi-sucursal. Todos los módulos desbloqueados.
 * enterprise $199/mo Sin límites duros. Ideal para cadenas o franquicias.
 */

/** Feature flags — un `false` bloquea la creación de registros en ese módulo. */
export interface PlanFeatures {
  /** Kits / combos de artículos. */
  kits:           boolean;
  /** Cotizaciones / presupuestos. */
  cotizaciones:   boolean;
  /** Promociones y códigos de descuento. */
  promociones:    boolean;
  /** Tarjetas de regalo. */
  tarjetasRegalo: boolean;
  /** Recetas / BOM (si el negocio produce). */
  recetas:        boolean;
  /** Módulo de compras y órdenes a proveedores. */
  compras:        boolean;
}

export interface PlanLimits {
  code:  string;
  label: string;
  /** `null` = sin tope en esta versión del software */
  maxUsers:     number | null;
  maxTiendas:   number | null;
  /** Artículos activos en catálogo. `null` = ilimitado. */
  maxArticulos: number | null;
  /** Módulos habilitados en este plan. */
  features: PlanFeatures;
}

const ALL_FEATURES: PlanFeatures = {
  kits:           true,
  cotizaciones:   true,
  promociones:    true,
  tarjetasRegalo: true,
  recetas:        true,
  compras:        true,
};

const STARTER_FEATURES: PlanFeatures = {
  kits:           false,
  cotizaciones:   false,
  promociones:    false,
  tarjetasRegalo: false,
  recetas:        false,
  compras:        false,
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: {
    code:         'starter',
    label:        'Starter',
    maxUsers:     3,
    maxTiendas:   1,
    maxArticulos: 500,
    features:     STARTER_FEATURES,
  },
  standard: {
    code:         'standard',
    label:        'Standard',
    maxUsers:     15,
    maxTiendas:   5,
    maxArticulos: 5_000,
    features:     ALL_FEATURES,
  },
  enterprise: {
    code:         'enterprise',
    label:        'Enterprise',
    maxUsers:     null,
    maxTiendas:   null,
    maxArticulos: null,
    features:     ALL_FEATURES,
  },
};

export function resolvePlanLimits(planCode: string | null | undefined): PlanLimits {
  const key = (planCode ?? 'standard').toLowerCase();
  return PLAN_LIMITS[key] ?? PLAN_LIMITS.standard;
}

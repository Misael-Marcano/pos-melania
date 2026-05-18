/**
 * Planes mostrados en la landing (debe coincidir con apps/backend/src/saas/plan-limits.ts).
 * Verificación: `npm run verify:landing-plans` en la raíz del monorepo (también en CI).
 */

export const PLANS = [
  {
    code: 'starter',
    label: 'Starter',
    price: '$29',
    period: '/mes',
    description: 'Para negocios pequeños con un solo local y equipo reducido.',
    highlight: false,
    accent: 'from-navy-600 to-navy-800',
    limits: ['3 usuarios', '1 sucursal', 'Hasta 500 artículos'],
    features: [
      'Ventas en tienda',
      'Inventario y categorías',
      'Clientes y crédito',
      'Gastos por categoría',
      'Cajas y cierres en PDF',
      'Reportes básicos',
      'NCF / DGII fiscal',
      'Auditoría de cambios',
    ],
    locked: [
      'Kits y combos',
      'Cotizaciones',
      'Promociones',
      'Tarjetas regalo',
      'Recetas / BOM',
      'Compras a proveedores',
    ],
    cta: 'Contratar Starter',
  },
  {
    code: 'standard',
    label: 'Standard',
    price: '$79',
    period: '/mes',
    description: 'Multi-sucursal con todos los módulos desbloqueados.',
    highlight: true,
    accent: 'from-primary-500 to-primary-700',
    limits: ['15 usuarios', '5 sucursales', 'Hasta 5 000 artículos'],
    features: [
      'Todo lo de Starter',
      'Kits y combos de artículos',
      'Cotizaciones → venta directa',
      'Promociones y descuentos',
      'Tarjetas regalo',
      'Recetas / BOM (producción)',
      'Compras y órdenes a proveedores',
      'Reportes avanzados + DGII 607/606',
    ],
    locked: [] as string[],
    cta: 'Contratar Standard',
  },
  {
    code: 'enterprise',
    label: 'Enterprise',
    price: '$199',
    period: '/mes',
    description: 'Sin límites. Ideal para cadenas de tiendas y franquicias.',
    highlight: false,
    accent: 'from-amber-600 to-amber-800',
    limits: ['Usuarios ilimitados', 'Sucursales ilimitadas', 'Artículos ilimitados'],
    features: [
      'Todo lo de Standard',
      'Multi-organización (plataforma)',
      'Panel de administración global',
      'Onboarding dedicado',
      'Soporte prioritario',
    ],
    locked: [] as string[],
    cta: 'Contactar ventas',
  },
] as const;

export type LandingPlan = (typeof PLANS)[number];

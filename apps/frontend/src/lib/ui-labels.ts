/**
 * Etiquetas y flags de UI por despliegue (Fase B — marca / módulos).
 * Ver `.env.example`: `NEXT_PUBLIC_LABEL_*`, `NEXT_PUBLIC_FEATURE_*`.
 */

/** Por defecto el módulo está activo; solo `false` / `0` / cadena vacía lo ocultan */
function featureDisabled(v: string | undefined): boolean {
  if (v === undefined) return false;
  const s = v.trim().toLowerCase();
  return s === '' || s === '0' || s === 'false';
}

export const uiLabels = {
  /** Primer segmento del breadcrumb en el header */
  breadcrumbRoot: process.env.NEXT_PUBLIC_LABEL_BREADCRUMB_ROOT ?? 'Nexo',

  /**
   * Módulo BOM / listas de materiales (ruta `/recetas`).
   * Desactivar en retail puro: `NEXT_PUBLIC_FEATURE_RECETAS=false`
   */
  featureRecetas: !featureDisabled(process.env.NEXT_PUBLIC_FEATURE_RECETAS),

  /** Plural — menú, títulos */
  recetas: process.env.NEXT_PUBLIC_LABEL_RECETAS ?? 'Recetas',
  /** Singular — formularios y mensajes */
  receta: process.env.NEXT_PUBLIC_LABEL_RECETA ?? 'Receta',

  /** Módulo de reportes (`/reportes`) — menú lateral, breadcrumb, pestañas */
  reportes: process.env.NEXT_PUBLIC_LABEL_REPORTES ?? 'Reportes',
} as const;

/** Pestañas del área de reportes (agrupaciones) — sobreescribibles por despliegue */
export const reportesTabs = {
  ventas: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_VENTAS ?? 'Ventas',
  pnl: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_PNL ?? 'P&L',
  inventario: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_INVENTARIO ?? 'Inventario',
  clientes: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_CLIENTES ?? 'Clientes',
  sucursal: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_SUCURSAL ?? 'Por sucursal',
  auditoria: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_AUDITORIA ?? 'Auditoría',
  dgii: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_DGII ?? 'DGII',
  operaciones: process.env.NEXT_PUBLIC_LABEL_REPORTES_TAB_OPERACIONES ?? 'Operaciones',
} as const;

/** Título de la página de listas de producción */
export function recetasPageTitle(): string {
  return (
    process.env.NEXT_PUBLIC_LABEL_RECETAS_HEADER ??
    `${uiLabels.recetas} de producción`
  );
}

/** Título visible en cabecera de `/reportes` (y header global) */
export function reportesPageTitle(): string {
  return (
    process.env.NEXT_PUBLIC_LABEL_REPORTES_HEADER ??
    uiLabels.reportes
  );
}

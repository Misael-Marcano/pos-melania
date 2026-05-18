import type { TenantPanelRow } from '@pos/shared';
import { downloadCSV } from '@/components/reportes/reportes-shared';

export function exportTenantPanelCsv(rows: TenantPanelRow[]) {
  const headers = [
    'id',
    'nombre',
    'slug',
    'activo',
    'plan',
    'billing',
    'seats',
    'max_users',
    'tiendas',
    'max_tiendas',
    'articulos',
    'max_articulos',
    'ventas_mes',
  ];
  const data = rows.map((t) => [
    t.id,
    t.nombre,
    t.slug,
    t.activo ? 'si' : 'no',
    t.planCode,
    t.billingStatus ?? '',
    t.usage.seats,
    t.limits.maxUsers ?? '',
    t.usage.tiendasActivas,
    t.limits.maxTiendas ?? '',
    t.usage.articulosActivos,
    t.limits.maxArticulos ?? '',
    t.usage.ventasMesActual,
  ]);
  downloadCSV(`organizaciones-${new Date().toISOString().slice(0, 10)}.csv`, headers, data);
}

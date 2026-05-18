import type { TenantPanelRow } from '@pos/shared';

export type TenantPanelSortKey =
  | 'nombre'
  | 'plan'
  | 'billing'
  | 'seats'
  | 'ventas';

export type SortDir = 'asc' | 'desc';

function seatPct(t: TenantPanelRow): number {
  const max = t.limits.maxUsers;
  if (!max) return 0;
  return t.usage.seats / max;
}

const BILLING_ORDER: Record<string, number> = {
  past_due: 0,
  unpaid: 1,
  canceled: 2,
  incomplete_expired: 3,
  trialing: 4,
  active: 5,
};

export function sortTenantPanelRows(
  rows: TenantPanelRow[],
  key: TenantPanelSortKey,
  dir: SortDir,
): TenantPanelRow[] {
  const mult = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'nombre':
        cmp = a.nombre.localeCompare(b.nombre, 'es');
        break;
      case 'plan':
        cmp = a.planCode.localeCompare(b.planCode);
        break;
      case 'billing': {
        const ao = a.billingStatus ? BILLING_ORDER[a.billingStatus] ?? 99 : 50;
        const bo = b.billingStatus ? BILLING_ORDER[b.billingStatus] ?? 99 : 50;
        cmp = ao - bo;
        break;
      }
      case 'seats':
        cmp = seatPct(a) - seatPct(b);
        break;
      case 'ventas':
        cmp = a.usage.ventasMesActual - b.usage.ventasMesActual;
        break;
      default:
        cmp = 0;
    }
    return cmp * mult;
  });
}

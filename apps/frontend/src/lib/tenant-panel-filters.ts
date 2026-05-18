import type { TenantPanelRow } from '@pos/shared';

export type BillingFilter = 'all' | 'past_due' | 'none' | 'active_ok';
export type ActivoFilter = 'all' | 'activo' | 'inactivo';
export type TrialFilter = 'all' | 'trial_soon';

const MS_DAY = 86_400_000;

export function trialDaysRemaining(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / MS_DAY);
}

export function filterTenantPanelRows(
  tenants: TenantPanelRow[],
  opts: {
    query: string;
    billingFilter: BillingFilter;
    planFilter: string;
    activoFilter: ActivoFilter;
    trialFilter: TrialFilter;
  },
): TenantPanelRow[] {
  let list = tenants;
  const q = opts.query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t) => t.nombre.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
  }
  if (opts.billingFilter === 'past_due') {
    list = list.filter((t) => t.billingStatus === 'past_due');
  } else if (opts.billingFilter === 'none') {
    list = list.filter((t) => !t.billingStatus);
  } else if (opts.billingFilter === 'active_ok') {
    list = list.filter(
      (t) => t.billingStatus === 'active' || t.billingStatus === 'trialing',
    );
  }
  if (opts.planFilter !== 'all') {
    list = list.filter((t) => t.planCode === opts.planFilter);
  }
  if (opts.activoFilter === 'activo') {
    list = list.filter((t) => t.activo);
  } else if (opts.activoFilter === 'inactivo') {
    list = list.filter((t) => !t.activo);
  }
  if (opts.trialFilter === 'trial_soon') {
    list = list.filter((t) => {
      const d = trialDaysRemaining(t.trialEndsAt ?? null);
      return d != null && d >= 0 && d <= 7;
    });
  }
  return list;
}

export const TENANT_PANEL_PAGE_SIZE = 25;

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { SAAS_CONTEXT_KEY } from '@/hooks/useSaasContext';
import { useTenantsPanel } from '@/hooks/useTenantsPanel';
import { tenantsService, type TenantPanelRow } from '@/services/tenants.service';
import { PageHeader } from '@/components/layout/PageHeader';
import { Select } from '@/components/ui/Select';
import { QueryError } from '@/components/reportes/reportes-shared';
import {
  sortTenantPanelRows,
  type TenantPanelSortKey,
  type SortDir,
} from '@/lib/tenant-panel-sort';
import {
  filterTenantPanelRows,
  trialDaysRemaining,
  TENANT_PANEL_PAGE_SIZE,
  type ActivoFilter,
  type TrialFilter,
} from '@/lib/tenant-panel-filters';
import { exportTenantPanelCsv } from '@/lib/export-tenant-panel-csv';
import {
  Building2, Users2, Store, Package, CreditCard, ShoppingCart,
  CheckCircle2, AlertTriangle, XCircle, Clock, Search, ArrowUpDown,
  Download, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';

function BillingChip({
  status,
  trialEndsAt,
}: {
  status: string | null;
  trialEndsAt?: string | null;
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-navy-100 text-navy-500 border border-navy-200">
        <Clock size={11} /> Sin suscripción
      </span>
    );
  }
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active:             { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 size={11} />, label: 'Activo' },
    trialing:           { color: 'bg-blue-50 text-blue-800 border-blue-200',          icon: <Clock size={11} />,        label: 'Prueba' },
    past_due:           { color: 'bg-amber-50 text-amber-900 border-amber-200',       icon: <AlertTriangle size={11} />, label: 'En mora' },
    canceled:           { color: 'bg-rose-50 text-rose-800 border-rose-200',          icon: <XCircle size={11} />,      label: 'Cancelado' },
    unpaid:             { color: 'bg-rose-50 text-rose-800 border-rose-200',          icon: <XCircle size={11} />,      label: 'Impago' },
    incomplete_expired: { color: 'bg-rose-50 text-rose-800 border-rose-200',          icon: <XCircle size={11} />,      label: 'Expirado' },
  };
  const cfg = map[status] ?? { color: 'bg-navy-100 text-navy-600 border-navy-200', icon: null, label: status };
  const trialDays = trialDaysRemaining(trialEndsAt);
  const trialTitle =
    trialDays != null && trialDays >= 0
      ? `Trial termina en ${trialDays} día${trialDays === 1 ? '' : 's'}`
      : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}
      title={trialTitle}
    >
      {cfg.icon} {cfg.label}
      {trialDays != null && trialDays >= 0 && trialDays <= 7 ? (
        <span className="text-[10px] opacity-80">({trialDays}d)</span>
      ) : null}
    </span>
  );
}

function stripeCustomerUrl(customerId: string): string {
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

function UsageBar({ value, max }: { value: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : null;
  const color = pct == null ? '' : pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <UsageBarInner value={value} max={max} pct={pct} color={color} />
  );
}

function UsageBarInner({
  value, max, pct, color,
}: { value: number; max: number | null; pct: number | null; color: string }) {
  return (
    <div className="min-w-[72px]">
      <span className="text-xs font-medium text-navy-700">{value}{max ? `/${max}` : ''}</span>
      {pct != null && (
        <div className="h-1 rounded-full bg-navy-100 overflow-hidden mt-1">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

type SortableCol = { label: string; key?: TenantPanelSortKey };

const SORTABLE_COLUMNS: SortableCol[] = [
  { label: 'Organización', key: 'nombre' },
  { label: 'Plan', key: 'plan' },
  { label: 'Facturación', key: 'billing' },
  { label: 'Usuarios', key: 'seats' },
  { label: 'Sucursales' },
  { label: 'Artículos' },
  { label: 'Ventas (mes)', key: 'ventas' },
  { label: '' },
];

export default function PlataformaPage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const user     = useAuthStore((s) => s.user);
  const loaded   = useAuthStore((s) => s.loaded);
  const setPtid  = useAuthStore((s) => s.setPlatformTenantId);

  const [query, setQuery] = useState('');
  const [billingFilter, setBillingFilter] = useState<
    'all' | 'past_due' | 'none' | 'active_ok'
  >('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [activoFilter, setActivoFilter] = useState<ActivoFilter>('all');
  const [trialFilter, setTrialFilter] = useState<TrialFilter>('all');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<TenantPanelSortKey>('nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: tenants = [], isLoading, isError, error, refetch } = useTenantsPanel();

  useEffect(() => {
    if (!loaded) return;
    if (!user) router.replace('/login');
    else if (user.rol !== 'plataforma') router.replace('/panel');
  }, [loaded, user, router]);

  const filtered = useMemo(
    () => filterTenantPanelRows(tenants, {
      query,
      billingFilter,
      planFilter,
      activoFilter,
      trialFilter,
    }),
    [tenants, query, billingFilter, planFilter, activoFilter, trialFilter],
  );

  const sorted = useMemo(
    () => sortTenantPanelRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / TENANT_PANEL_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * TENANT_PANEL_PAGE_SIZE;
    return sorted.slice(start, start + TENANT_PANEL_PAGE_SIZE);
  }, [sorted, safePage]);

  useEffect(() => {
    setPage(1);
  }, [query, billingFilter, planFilter, activoFilter, trialFilter, sortKey, sortDir]);

  const toggleSort = (key: TenantPanelSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const stats = useMemo(() => ({
    total:    filtered.length,
    activos:  filtered.filter((t) => t.activo).length,
    pastDue:  filtered.filter((t) => t.billingStatus === 'past_due').length,
    canceled: filtered.filter((t) => t.billingStatus === 'canceled').length,
  }), [filtered]);

  const operate = (id: number) => {
    void tenantsService.recordOperate(id).catch(() => undefined);
    setPtid(id);
    void qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
    router.push('/panel');
  };

  const errorMsg = error instanceof Error ? error.message : 'No se pudo cargar el panel';
  const hasFilters =
    query.trim() !== ''
    || billingFilter !== 'all'
    || planFilter !== 'all'
    || activoFilter !== 'all'
    || trialFilter !== 'all';
  const emptyMessage = hasFilters
    ? 'Ninguna organización coincide con los filtros'
    : 'No hay organizaciones registradas';

  if (!loaded || (user && user.rol !== 'plataforma')) {
    return (
      <PanelPageSpinner />
    );
  }

  return (
    <main aria-labelledby="plataforma-heading" className="space-y-6">
      <h1 id="plataforma-heading" className="sr-only">
        Panel de organizaciones
      </h1>
      <PageHeader title="Panel de organizaciones" breadcrumb={['Plataforma', 'Panel de organizaciones']} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-live="polite" aria-atomic="true">
        {[
          { label: 'Mostrando',  value: stats.total,    color: 'text-navy-800' },
          { label: 'Activas',    value: stats.activos,  color: 'text-emerald-600' },
          { label: 'En mora',    value: stats.pastDue,  color: 'text-amber-600' },
          { label: 'Canceladas', value: stats.canceled, color: 'text-rose-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-card px-4 py-3">
            <p className="text-xs text-navy-400 mb-0.5">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:items-end">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="search"
            placeholder="Buscar por nombre o slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-9 text-sm py-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            wrapperClassName="min-w-[160px] shrink-0"
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value as typeof billingFilter)}
            className="py-2.5 text-sm"
            aria-label="Filtrar por facturación"
          >
            <option value="all">Todas — facturación</option>
            <option value="active_ok">Activo / prueba</option>
            <option value="past_due">En mora</option>
            <option value="none">Sin suscripción</option>
          </Select>
          <Select
            wrapperClassName="min-w-[140px] shrink-0"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="py-2.5 text-sm"
            aria-label="Filtrar por plan"
          >
            <option value="all">Todos los planes</option>
            <option value="starter">Starter</option>
            <option value="standard">Standard</option>
            <option value="enterprise">Enterprise</option>
          </Select>
          <Select
            wrapperClassName="min-w-[130px] shrink-0"
            value={activoFilter}
            onChange={(e) => setActivoFilter(e.target.value as ActivoFilter)}
            className="py-2.5 text-sm"
            aria-label="Filtrar por estado"
          >
            <option value="all">Todas — estado</option>
            <option value="activo">Activas</option>
            <option value="inactivo">Inactivas</option>
          </Select>
          <Select
            wrapperClassName="min-w-[150px] shrink-0"
            value={trialFilter}
            onChange={(e) => setTrialFilter(e.target.value as TrialFilter)}
            className="py-2.5 text-sm"
            aria-label="Filtrar por trial"
          >
            <option value="all">Trial — todos</option>
            <option value="trial_soon">Trial por vencer (7d)</option>
          </Select>
          <button
            type="button"
            onClick={() => exportTenantPanelCsv(sorted)}
            disabled={sorted.length === 0}
            className="btn-outline text-sm py-2.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && !isLoading && (
        <QueryError message={errorMsg} onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && (
        <>
          <TenantPanelMobileList rows={paginated} emptyMessage={emptyMessage} operate={operate} />
          <div className="hidden md:block bg-white rounded-[12px] shadow-card overflow-hidden">
            <TenantPanelTable
              rows={paginated}
              emptyMessage={emptyMessage}
              operate={operate}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          </div>
          {sorted.length > TENANT_PANEL_PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-navy-600">
              <p>
                Página {safePage} de {totalPages} · {sorted.length} organizaciones
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-outline py-1.5 px-2.5 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-outline py-1.5 px-2.5 disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function PanelPageSpinner() {
  return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function TenantPanelTable({
  rows, emptyMessage, operate, sortKey, sortDir, onSort,
}: {
  rows: TenantPanelRow[];
  emptyMessage: string;
  operate: (id: number) => void;
  sortKey: TenantPanelSortKey;
  sortDir: SortDir;
  onSort: (key: TenantPanelSortKey) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-100/60 bg-navy-50/50">
            {SORTABLE_COLUMNS.map((col) => (
              <th
                key={col.label || 'action'}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.key ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key!)}
                    className="inline-flex items-center gap-1 hover:text-navy-800"
                  >
                    {col.label}
                    <ArrowUpDown
                      size={12}
                      className={sortKey === col.key ? 'text-primary-600' : 'opacity-40'}
                      aria-hidden
                    />
                    {sortKey === col.key && (
                      <span className="sr-only">{sortDir === 'asc' ? 'ascendente' : 'descendente'}</span>
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100/40">
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-navy-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-navy-50/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-primary-600" />
                  </div>
                  <TenantNameCell t={t} />
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-100 text-navy-700">
                  {t.planLabel}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                        <BillingChip status={t.billingStatus} trialEndsAt={t.trialEndsAt} />
                        {t.stripeCustomerId && (
                          <span className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-navy-400 truncate max-w-[100px]" title={t.stripeCustomerId}>
                              {t.stripeCustomerId.slice(0, 14)}…
                            </span>
                            <a
                              href={stripeCustomerUrl(t.stripeCustomerId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700"
                              aria-label={`Abrir cliente Stripe de ${t.nombre}`}
                            >
                              <ExternalLink size={11} />
                            </a>
                          </span>
                        )}
                </div>
              </td>
              <td className="px-4 py-3 min-w-[88px]">
                <div className="flex items-center gap-1.5">
                  <Users2 size={13} className="text-navy-400 shrink-0" />
                  <UsageBar value={t.usage.seats} max={t.limits.maxUsers} />
                </div>
              </td>
              <td className="px-4 py-3 min-w-[88px]">
                <div className="flex items-center gap-1.5">
                  <Store size={13} className="text-navy-400 shrink-0" />
                  <UsageBar value={t.usage.tiendasActivas} max={t.limits.maxTiendas} />
                </div>
              </td>
              <td className="px-4 py-3 min-w-[88px]">
                <div className="flex items-center gap-1.5">
                  <Package size={13} className="text-navy-400 shrink-0" />
                  <UsageBar value={t.usage.articulosActivos} max={t.limits.maxArticulos} />
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <TenantSalesCell t={t} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => operate(t.id)}
                  aria-label={`Operar en ${t.nombre}`}
                  className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <CreditCard size={12} /> Operar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TenantNameCell({ t }: { t: TenantPanelRow }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-navy-800 truncate">{t.nombre}</p>
      <p className="text-xs text-navy-400 font-mono">{t.slug}</p>
    </div>
  );
}

function TenantSalesCell({ t }: { t: TenantPanelRow }) {
  return (
    <div className="flex items-center justify-end gap-1.5 text-navy-700">
      <ShoppingCart size={13} className="text-navy-400 shrink-0" />
      <span className="text-xs font-semibold tabular-nums">{t.usage.ventasMesActual}</span>
      <span className="text-[10px] text-navy-400">mes</span>
    </div>
  );
}

function TenantPanelMobileList({
  rows,
  emptyMessage,
  operate,
}: {
  rows: TenantPanelRow[];
  emptyMessage: string;
  operate: (id: number) => void;
}) {
  return (
    <div className="md:hidden space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-navy-400 text-center py-8">{emptyMessage}</p>
      ) : (
        rows.map((t) => (
          <TenantPanelMobileCard key={t.id} t={t} onOperate={() => operate(t.id)} />
        ))
      )}
    </div>
  );
}

function TenantPanelMobileCard({
  t,
  onOperate,
}: {
  t: TenantPanelRow;
  onOperate: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-navy-800 truncate">{t.nombre}</p>
          <p className="text-xs text-navy-400 font-mono">{t.slug}</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-100 text-navy-700 shrink-0">
          {t.planLabel}
        </span>
      </div>
      <BillingChip status={t.billingStatus} trialEndsAt={t.trialEndsAt} />
      {t.stripeCustomerId ? (
        <a
          href={stripeCustomerUrl(t.stripeCustomerId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary-600 inline-flex items-center gap-1"
        >
          Stripe <ExternalLink size={11} />
        </a>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-xs text-navy-600">
        <MobileUsageMetric label="Usuarios" value={t.usage.seats} max={t.limits.maxUsers} />
        <MobileUsageMetric label="Sucursales" value={t.usage.tiendasActivas} max={t.limits.maxTiendas} />
        <MobileUsageMetric label="Artículos" value={t.usage.articulosActivos} max={t.limits.maxArticulos} />
        <div className="flex items-center gap-1">
          Ventas mes: <strong className="text-navy-800">{t.usage.ventasMesActual}</strong>
        </div>
      </div>
      <button type="button" onClick={onOperate} className="btn-outline w-full text-xs py-2 justify-center gap-1.5">
        <CreditCard size={12} /> Operar
      </button>
    </div>
  );
}

function MobileUsageMetric({
  label, value, max,
}: { label: string; value: number; max: number | null }) {
  return (
    <div>
      <span className="text-navy-400">{label}: </span>
      <UsageBar value={value} max={max} />
    </div>
  );
}

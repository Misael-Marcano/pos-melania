'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { SAAS_CONTEXT_KEY } from '@/hooks/useSaasContext';
import { tenantsService, type TenantPanel } from '@/services/tenants.service';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Building2, Users2, Store, Package, CreditCard,
  CheckCircle2, AlertTriangle, XCircle, Clock, Search,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function BillingChip({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-navy-100 text-navy-500 border border-navy-200">
        <Clock size={11} /> sin suscripción
      </span>
    );
  }
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active:             { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 size={11} />, label: 'active' },
    trialing:           { color: 'bg-blue-50 text-blue-800 border-blue-200',          icon: <Clock size={11} />,        label: 'trial' },
    past_due:           { color: 'bg-amber-50 text-amber-900 border-amber-200',       icon: <AlertTriangle size={11} />, label: 'past_due' },
    canceled:           { color: 'bg-rose-50 text-rose-800 border-rose-200',          icon: <XCircle size={11} />,      label: 'canceled' },
    unpaid:             { color: 'bg-rose-50 text-rose-800 border-rose-200',          icon: <XCircle size={11} />,      label: 'unpaid' },
    incomplete_expired: { color: 'bg-rose-50 text-rose-800 border-rose-200',          icon: <XCircle size={11} />,      label: 'exp.' },
  };
  const cfg = map[status] ?? { color: 'bg-navy-100 text-navy-600 border-navy-200', icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function UsageBar({ value, max, label }: { value: number; max: number | null; label: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : null;
  const color = pct == null ? '' : pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-1 text-xs text-navy-500 mb-0.5">
        <span>{label}</span>
        <span className="font-medium text-navy-700">{value}{max ? `/${max}` : ''}</span>
      </div>
      {pct != null && (
        <div className="h-1 rounded-full bg-navy-100 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PlataformaPage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const user     = useAuthStore((s) => s.user);
  const loaded   = useAuthStore((s) => s.loaded);
  const setPtid  = useAuthStore((s) => s.setPlatformTenantId);

  const [tenants, setTenants] = useState<TenantPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [query,   setQuery]   = useState('');
  const [billingFilter, setBillingFilter] = useState<
    'all' | 'past_due' | 'none' | 'active_ok'
  >('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  useEffect(() => {
    if (!loaded) return;
    if (!user) { router.replace('/login'); return; }
    if (user.rol !== 'plataforma') { router.replace('/panel'); return; }

    let cancelled = false;
    (async () => {
      try {
        const list = await tenantsService.panel();
        if (!cancelled) setTenants(list);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar el panel');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, user, router]);

  const filtered = useMemo(() => {
    let list = tenants;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.nombre.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
      );
    }
    if (billingFilter === 'past_due') {
      list = list.filter((t) => t.billingStatus === 'past_due');
    } else if (billingFilter === 'none') {
      list = list.filter((t) => !t.billingStatus);
    } else if (billingFilter === 'active_ok') {
      list = list.filter(
        (t) => t.billingStatus === 'active' || t.billingStatus === 'trialing',
      );
    }
    if (planFilter !== 'all') {
      list = list.filter((t) => t.planCode === planFilter);
    }
    return list;
  }, [tenants, query, billingFilter, planFilter]);

  const operate = (id: number) => {
    setPtid(id);
    void qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
    router.push('/panel');
  };

  // ── Stats rápidas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    tenants.length,
    activos:  tenants.filter((t) => t.activo).length,
    pastDue:  tenants.filter((t) => t.billingStatus === 'past_due').length,
    canceled: tenants.filter((t) => t.billingStatus === 'canceled').length,
  }), [tenants]);

  return (
    <div className="space-y-6">
      <PageHeader title="Panel de organizaciones" breadcrumb={['Plataforma', 'Panel de organizaciones']} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: stats.total,    color: 'text-navy-800' },
          { label: 'Activas',      value: stats.activos,  color: 'text-emerald-600' },
          { label: 'En mora',      value: stats.pastDue,  color: 'text-amber-600' },
          { label: 'Canceladas',   value: stats.canceled, color: 'text-rose-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-card px-4 py-3">
            <p className="text-xs text-navy-400 mb-0.5">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:items-end">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-9 text-sm py-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value as typeof billingFilter)}
            className="input-field text-sm py-2 min-w-[160px]"
            aria-label="Filtrar por facturación"
          >
            <option value="all">Todas — facturación</option>
            <option value="active_ok">Stripe activo / trial</option>
            <option value="past_due">En mora (past_due)</option>
            <option value="none">Sin estado Stripe</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="input-field text-sm py-2 min-w-[140px]"
            aria-label="Filtrar por plan"
          >
            <option value="all">Todos los planes</option>
            <option value="starter">starter</option>
            <option value="standard">standard</option>
            <option value="enterprise">enterprise</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100/60 bg-navy-50/50">
                  {['Organización', 'Plan', 'Facturación', 'Usuarios', 'Sucursales', 'Artículos', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100/40">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-navy-400 text-sm">
                      Sin resultados
                    </td>
                  </tr>
                )}
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-navy-50/30 transition-colors">
                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-navy-800 truncate">{t.nombre}</p>
                          <p className="text-xs text-navy-400 font-mono">{t.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-100 text-navy-700">
                        {t.planLabel}
                      </span>
                    </td>

                    {/* Facturación */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <BillingChip status={t.billingStatus} />
                        {t.stripeCustomerId && (
                          <span className="text-[10px] font-mono text-navy-400 truncate max-w-[120px]" title={t.stripeCustomerId}>
                            {t.stripeCustomerId.slice(0, 14)}…
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Usuarios */}
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-1.5 text-navy-600">
                        <Users2 size={13} className="text-navy-400 shrink-0" />
                        <UsageBar value={t.usage.seats} max={t.limits.maxUsers} label="" />
                      </div>
                    </td>

                    {/* Sucursales */}
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-1.5 text-navy-600">
                        <Store size={13} className="text-navy-400 shrink-0" />
                        <UsageBar value={t.usage.tiendasActivas} max={t.limits.maxTiendas} label="" />
                      </div>
                    </td>

                    {/* Artículos */}
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-1.5 text-navy-600">
                        <Package size={13} className="text-navy-400 shrink-0" />
                        <UsageBar value={t.usage.articulosActivos} max={t.limits.maxArticulos} label="" />
                      </div>
                    </td>

                    {/* Acción */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => operate(t.id)}
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
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
} from 'lucide-react';
import { appBrand } from '@/lib/app-brand';
import { uiLabels } from '@/lib/ui-labels';
import { isStaticSite } from '@/lib/site-mode';
import { LandingDemoCta } from '@/components/landing/LandingDemoCta';
import { NexoIcon } from '@/components/layout/NexoIcon';

const CAPABILITIES = [
  { icon: Receipt, label: 'NCF / DGII', desc: 'Series fiscales y checklist operativo' },
  { icon: Store, label: 'Multi-sucursal', desc: 'Cajas, stock y equipo por tienda' },
  { icon: BarChart3, label: uiLabels.reportes, desc: 'Métricas y exportación fiscal' },
  { icon: ShieldCheck, label: 'Auditoría', desc: 'Trazabilidad de cambios críticos' },
] as const;

export function LandingHero() {
  return (
    <section className="relative px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-700 shadow-sm backdrop-blur-sm">
            <Sparkles size={12} className="text-primary-500" aria-hidden />
            Plataforma POS · {appBrand.tagline}
          </p>

          <h1
            id="landing-heading"
            className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl lg:text-[3.25rem]"
          >
            Tu operación retail,
            <span className="mt-1 block bg-gradient-to-r from-primary-600 via-primary-500 to-secondary bg-clip-text text-transparent">
              centralizada y lista para crecer
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-500 sm:text-lg">
            Ventas en caja, inventario en vivo, clientes con crédito y {uiLabels.reportes.toLowerCase()}{' '}
            avanzados — desde un local hasta una cadena de tiendas, con facturación fiscal integrada.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={isStaticSite ? '/solicitar-demo' : '/login'}
              className="btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base shadow-lg shadow-primary-900/15"
            >
              {isStaticSite ? 'Solicitar demo' : 'Acceder al sistema'}
              <ArrowRight size={17} aria-hidden />
            </Link>
            {isStaticSite ? (
              <LandingDemoCta />
            ) : (
              <Link
                href="/solicitar-demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-200/90 bg-white/80 px-7 py-3.5 text-base font-semibold text-navy-700 shadow-sm backdrop-blur-sm transition-colors hover:border-navy-300 hover:bg-white"
              >
                Solicitar demo
              </Link>
            )}
            <a
              href="#planes"
              className="text-center text-sm font-medium text-primary-600 underline decoration-primary-300/80 underline-offset-4 hover:text-primary-700 sm:ml-1"
            >
              Ver planes
            </a>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, label, desc }) => (
              <li
                key={label}
                className="rounded-2xl border border-white/80 bg-white/70 px-3.5 py-3.5 shadow-sm backdrop-blur-sm"
              >
                <Icon size={16} className="mb-2 text-primary-600" aria-hidden />
                <p className="text-xs font-semibold text-navy-800">{label}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-navy-400">{desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary-400/20 via-transparent to-secondary/25 blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/70 shadow-float backdrop-blur-sm">
            <div className="border-b border-navy-100/80 bg-gradient-to-r from-primary-700 via-primary-600 to-[#1a2618] px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                    <NexoIcon className="h-full w-full" ariaLabel="" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold">{appBrand.shortName}</p>
                    <p className="text-[10px] text-white/50">Panel de operaciones</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-primary-100 ring-1 ring-white/15">
                  En vivo
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Ventas hoy', value: '—', accent: 'from-primary-100 to-primary-50' },
                  { label: 'Stock bajo', value: '—', accent: 'from-amber-50 to-amber-100/80' },
                  { label: 'Cajas', value: '—', accent: 'from-secondary-container/60 to-white' },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`rounded-xl bg-gradient-to-br ${kpi.accent} px-3 py-3 ring-1 ring-navy-100/60`}
                  >
                    <p className="text-[10px] font-medium text-navy-500">{kpi.label}</p>
                    <p className="mt-1 font-display text-lg font-bold text-navy-800">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <ul className="space-y-2.5">
                {[
                  { icon: ShoppingCart, title: 'Venta en caja', sub: 'NCF, pagos mixtos y cambio' },
                  { icon: Package, title: 'Inventario', sub: 'Movimientos y alertas por sucursal' },
                  { icon: BarChart3, title: uiLabels.reportes, sub: 'Exportación y cumplimiento DGII' },
                ].map(({ icon: Icon, title, sub }) => (
                  <li
                    key={title}
                    className="flex items-center gap-3 rounded-xl border border-navy-100/70 bg-navy-50/50 px-3.5 py-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                      <Icon size={16} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-800">{title}</p>
                      <p className="truncate text-xs text-navy-400">{sub}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="text-center text-[10px] text-navy-400">
                Vista ilustrativa · los datos reales aparecen tras iniciar sesión
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

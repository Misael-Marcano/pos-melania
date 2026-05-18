import { Globe, Shield, Zap } from 'lucide-react';
import { appBrand } from '@/lib/app-brand';

const PILLARS = [
  {
    icon: Shield,
    title: 'Fiscalmente correcto',
    desc: 'NCF y series DGII integradas. Auditoría de cada cambio crítico y exportaciones 607/606 listas para presentar.',
  },
  {
    icon: Globe,
    title: 'Multi-sucursal nativo',
    desc: 'Abre nuevas tiendas sin cambiar de sistema. Cada sucursal con su caja, usuarios y reportes consolidados.',
  },
  {
    icon: Zap,
    title: 'Listo para operar',
    desc: 'Provisioning guiado, datos de prueba y runbook operativo para el primer día en producción.',
  },
] as const;

export function LandingPillars() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">
            Por qué {appBrand.shortName}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Diseñado para retail en República Dominicana
          </h2>
        </div>

        <ul className="grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="group rounded-[1.25rem] border border-white/90 bg-white/75 p-7 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-float"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-900/15">
                <Icon size={22} aria-hidden />
              </div>
              <h3 className="font-display text-lg font-bold text-navy-800">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

'use client';

import { PLANS, type LandingPlan } from './landing-plans';
import { PlanCard } from './PlanCard';

export function LandingPlans({ onContact }: { onContact: (p: LandingPlan) => void }) {
  return (
    <section id="planes" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">
            Precios
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Planes para cada etapa
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-navy-500 sm:text-base">
            Empieza con lo que necesitas hoy y escala sin migrar de plataforma. Todos los planes
            incluyen actualizaciones automáticas.
          </p>
        </div>

        <div className="grid grid-cols-1 items-end gap-6 pb-2 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.code} plan={plan} onContact={onContact} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-navy-400">
          Precios en USD. Facturación mensual recurrente. IVA no incluido cuando aplique.
        </p>
      </div>
    </section>
  );
}

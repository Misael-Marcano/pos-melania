'use client';

import { CheckCircle2, Lock, Zap } from 'lucide-react';
import type { LandingPlan } from './landing-plans';

export function PlanCard({
  plan,
  onContact,
}: {
  plan: LandingPlan;
  onContact: (p: LandingPlan) => void;
}) {
  const isHighlight = plan.highlight;

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-200 ${
        isHighlight
          ? 'z-10 shadow-float ring-2 ring-primary-400/50 lg:-translate-y-2'
          : 'border border-white/90 bg-white/80 shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`bg-gradient-to-br ${plan.accent} px-7 pb-8 pt-7`}>
        {isHighlight ? (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/15">
            <Zap size={10} aria-hidden /> Más popular
          </div>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          {plan.label}
        </p>
        <div className="mt-1 flex items-end gap-1.5">
          <span className="font-display text-5xl font-extrabold leading-none text-white">
            {plan.price}
          </span>
          <span className="mb-1 text-sm text-white/50">{plan.period}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/60">{plan.description}</p>
      </div>

      <div className="flex flex-1 flex-col bg-white/95 px-7 py-6 backdrop-blur-sm">
        <div className="mb-5 flex flex-wrap gap-2 border-b border-navy-100/80 pb-5">
          {plan.limits.map((l) => (
            <span
              key={l}
              className="rounded-full border border-navy-100 bg-navy-50/80 px-2.5 py-1 text-xs font-medium text-navy-600"
            >
              {l}
            </span>
          ))}
        </div>

        <ul className="mb-6 flex-1 space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary-500" aria-hidden />
              <span className="text-navy-700">{f}</span>
            </li>
          ))}
          {plan.locked.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm opacity-40 select-none">
              <Lock size={13} className="mt-0.5 shrink-0 text-navy-400" aria-hidden />
              <span className="text-navy-400 line-through">{f}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onContact(plan)}
          className={
            isHighlight
              ? 'btn-primary w-full py-3.5 text-sm shadow-lg shadow-primary-900/15'
              : 'w-full rounded-xl bg-navy-800 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-navy-900'
          }
        >
          {plan.cta}
        </button>
      </div>
    </article>
  );
}

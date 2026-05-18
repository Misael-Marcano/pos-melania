'use client';

import { ArrowRight, Mail, MessageCircle, X } from 'lucide-react';
import { appBrand } from '@/lib/app-brand';
import type { LandingPlan } from './landing-plans';

export function ContactModal({
  plan,
  onClose,
}: {
  plan: LandingPlan | null;
  onClose: () => void;
}) {
  if (!plan) return null;

  const email = appBrand.contactEmail;
  const whatsapp = appBrand.contactWhatsapp;
  const subject = encodeURIComponent(
    `Interés en plan ${plan.label} — ${plan.price}${plan.period}`,
  );
  const body = encodeURIComponent(
    `Hola, me interesa el plan ${plan.label} (${plan.price}${plan.period}) de ${appBrand.shortName}.\n\nQuedo atento/a a los detalles para proceder con el pago.`,
  );
  const waText = encodeURIComponent(
    `Hola, me interesa el plan *${plan.label}* (${plan.price}${plan.period}) de ${appBrand.shortName}. ¿Cómo procedo?`,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/80 bg-white shadow-float">
        <div className={`relative bg-gradient-to-br ${plan.accent} px-7 pb-6 pt-7`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            aria-label="Cerrar"
          >
            <X size={16} className="text-white" />
          </button>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/60">
            Plan seleccionado
          </p>
          <h2 id="contact-modal-title" className="font-display text-2xl font-bold text-white">
            {plan.label}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {plan.price}
            {plan.period} · {plan.description}
          </p>
        </div>

        <div className="px-7 py-6">
          <p className="mb-6 text-sm leading-relaxed text-navy-500">
            Contáctanos por cualquiera de estos canales y un asesor te guiará con el proceso de pago
            y activación de tu cuenta.
          </p>

          <div className="space-y-3">
            {email ? (
              <a
                href={`mailto:${email}?subject=${subject}&body=${body}`}
                className="group flex w-full items-center gap-4 rounded-2xl border border-navy-100 bg-navy-50/50 px-5 py-4 transition-all hover:border-primary-300 hover:bg-primary-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 transition-colors group-hover:bg-primary-200">
                  <Mail size={18} className="text-primary-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800">Correo electrónico</p>
                  <p className="truncate text-xs text-navy-500">{email}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="ml-auto shrink-0 text-navy-300 transition-colors group-hover:text-primary-500"
                  aria-hidden
                />
              </a>
            ) : null}

            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center gap-4 rounded-2xl border border-navy-100 bg-navy-50/50 px-5 py-4 transition-all hover:border-green-300 hover:bg-green-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 transition-colors group-hover:bg-green-200">
                  <MessageCircle size={18} className="text-green-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-800">WhatsApp</p>
                  <p className="text-xs text-navy-500">+{whatsapp}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="ml-auto shrink-0 text-navy-300 transition-colors group-hover:text-green-500"
                  aria-hidden
                />
              </a>
            ) : null}

            {!email && !whatsapp ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                Configure{' '}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs">
                  NEXT_PUBLIC_CONTACT_EMAIL
                </code>{' '}
                o{' '}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs">
                  NEXT_PUBLIC_CONTACT_WHATSAPP
                </code>{' '}
                para activar el contacto.
              </div>
            ) : null}
          </div>

          <p className="mt-5 text-center text-xs text-navy-400">
            Respuesta en menos de 24 horas hábiles.
          </p>
        </div>
      </div>
    </div>
  );
}

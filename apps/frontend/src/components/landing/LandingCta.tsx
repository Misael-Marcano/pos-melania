import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NexoIcon } from '@/components/layout/NexoIcon';
import { isStaticSite } from '@/lib/site-mode';
import { LandingDemoCta } from '@/components/landing/LandingDemoCta';

export function LandingCta() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-primary-700 via-primary-600 to-[#1a2618] px-8 py-14 text-center text-white shadow-float sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-secondary/20 blur-3xl"
        />

        <div className="relative">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
            <NexoIcon className="h-full w-full" ariaLabel="" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {isStaticSite ? '¿Listo para probarlo en tu negocio?' : '¿Ya tienes una cuenta?'}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-white/60">
            {isStaticSite
              ? 'Solicita una demo o despliega el sistema en tu red con Docker.'
              : 'Accede directamente a tu panel de operaciones.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isStaticSite ? (
              <LandingDemoCta className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-primary-700 shadow-lg transition-transform hover:-translate-y-0.5" />
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-primary-700 shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Iniciar sesión
                <ArrowRight size={18} aria-hidden />
              </Link>
            )}
            {isStaticSite ? (
              <Link
                href="/solicitar-demo"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Contactar ventas
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

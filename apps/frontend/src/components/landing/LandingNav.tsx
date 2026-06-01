import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { appBrand } from '@/lib/app-brand';
import { isStaticSite } from '@/lib/site-mode';
import { NexoIcon } from '@/components/layout/NexoIcon';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-md">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-900/15 transition-shadow group-hover:shadow-primary-900/25">
            <NexoIcon className="h-full w-full" ariaLabel="Nexo" />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-navy-800">
            {appBrand.shortName}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#planes"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800 sm:block"
          >
            Planes
          </a>
          <a
            href="#modulos"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800 md:block"
          >
            Módulos
          </a>
          <Link
            href="/solicitar-demo"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800 lg:inline-block"
          >
            Solicitar demo
          </Link>
          {isStaticSite ? (
            <Link href="/solicitar-demo" className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5">
              Solicitar demo
              <ArrowRight size={14} aria-hidden />
            </Link>
          ) : (
            <Link href="/login" className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5">
              Iniciar sesión
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

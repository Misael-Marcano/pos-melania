import Link from 'next/link';
import { appBrand, copyrightLine } from '@/lib/app-brand';
import { isStaticSite } from '@/lib/site-mode';
import { NexoIcon } from '@/components/layout/NexoIcon';

export function LandingFooter() {
  return (
    <footer className="border-t border-navy-200/40 bg-navy-900/95 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/15">
            <NexoIcon className="h-full w-full" ariaLabel="Nexo" />
          </div>
          <span className="text-sm font-medium text-white/50">{appBrand.shortName}</span>
        </Link>

        <span className="text-center text-xs text-white/30">{copyrightLine()}</span>

        <nav
          aria-label="Pie de página"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/40"
        >
          <a href="#planes" className="transition-colors hover:text-white/70">
            Planes
          </a>
          <Link href="/solicitar-demo" className="transition-colors hover:text-white/70">
            Solicitar demo
          </Link>
          <Link href="/terminos" className="transition-colors hover:text-white/70">
            Términos
          </Link>
          <Link href="/privacidad" className="transition-colors hover:text-white/70">
            Privacidad
          </Link>
          {!isStaticSite && (
            <Link href="/login" className="transition-colors hover:text-white/70">
              Acceder
            </Link>
          )}
        </nav>
      </div>
    </footer>
  );
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppAtmosphere } from '@/components/layout/AppAtmosphere';

interface PublicPageShellProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

/** Layout ligero para páginas públicas (legal, demo) con la misma atmósfera que landing/login. */
export function PublicPageShell({
  children,
  backHref = '/',
  backLabel = 'Volver al inicio',
}: PublicPageShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#E8EDEB]">
      <AppAtmosphere />
      <div className="relative flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <header className="mx-auto mb-6 w-full max-w-2xl">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-navy-200/80 bg-white/70 px-3.5 py-2 text-xs font-medium text-navy-600 shadow-sm backdrop-blur-sm transition-colors hover:border-navy-300 hover:text-navy-900"
          >
            <ArrowLeft size={14} aria-hidden />
            {backLabel}
          </Link>
        </header>
        <div className="mx-auto w-full max-w-2xl flex-1 pb-10">{children}</div>
      </div>
    </div>
  );
}

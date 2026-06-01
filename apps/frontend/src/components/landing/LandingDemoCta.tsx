'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { isStaticSite } from '@/lib/site-mode';
import { enterStaticDemo } from '@/lib/static-demo';

/** Botón para abrir el panel con datos de demostración (solo GitHub Pages). */
export function LandingDemoCta({ className = '' }: { className?: string }) {
  const router = useRouter();

  if (!isStaticSite) return null;

  const abrirDemo = () => {
    enterStaticDemo();
    router.push('/panel');
  };

  return (
    <button
      type="button"
      onClick={abrirDemo}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 rounded-xl border border-primary-300/90 bg-white/90 px-7 py-3.5 text-base font-semibold text-primary-800 shadow-sm backdrop-blur-sm transition-colors hover:border-primary-400 hover:bg-white'
      }
    >
      <LayoutDashboard size={18} aria-hidden />
      Ver panel (demo)
    </button>
  );
}

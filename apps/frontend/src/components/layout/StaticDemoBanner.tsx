'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import { exitStaticDemo } from '@/lib/static-demo';

export function StaticDemoBanner() {
  const router = useRouter();

  const salir = () => {
    exitStaticDemo();
    router.push('/');
  };

  return (
    <div className="shrink-0 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-between sm:text-left">
        <p className="inline-flex items-center gap-2 font-medium">
          <Sparkles size={16} className="shrink-0 text-amber-700" aria-hidden />
          Vista demo del panel — datos ficticios, sin guardar cambios
        </p>
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <Link href="/solicitar-demo" className="font-semibold underline underline-offset-2">
            Solicitar demo real
          </Link>
          <button
            type="button"
            onClick={salir}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold hover:bg-amber-100/80"
          >
            <X size={14} aria-hidden />
            Volver a la landing
          </button>
        </div>
      </div>
    </div>
  );
}

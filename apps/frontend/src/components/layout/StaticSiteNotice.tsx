import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CloudOff, ArrowLeft, Mail, LayoutDashboard } from 'lucide-react';
import { enterStaticDemo } from '@/lib/static-demo';

/** Aviso en login u otras rutas cuando el deploy no incluye backend. */
export function StaticSiteNotice() {
  const router = useRouter();

  const abrirDemo = () => {
    enterStaticDemo();
    router.push('/panel');
  };

  return (
    <div className="space-y-6" role="status">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-amber-950">
        <CloudOff className="mt-0.5 shrink-0 text-amber-700" size={22} aria-hidden />
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">Vista pública sin servidor</p>
          <p className="mt-1 text-amber-900/85">
            Este sitio en GitHub Pages muestra la landing y la interfaz de forma estática.
            El inicio de sesión y el POS requieren desplegar la API y la base de datos
            (Docker en tu red o un servidor con SQL Server y Redis).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={abrirDemo}
          className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
        >
          <LayoutDashboard size={16} aria-hidden />
          Ver panel (demo)
        </button>
        <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-6 py-3 text-sm font-semibold text-navy-700 shadow-sm hover:bg-navy-50">
          <ArrowLeft size={16} aria-hidden />
          Volver a la landing
        </Link>
        <Link
          href="/solicitar-demo"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-6 py-3 text-sm font-semibold text-navy-700 shadow-sm hover:bg-navy-50"
        >
          <Mail size={16} aria-hidden />
          Solicitar demo
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-navy-400">
        Si ya tienes el sistema instalado en tu red, abre la URL de tu servidor
        (por ejemplo <code className="rounded bg-navy-100 px-1">http://IP-del-servidor:3000</code>)
        y no esta página de GitHub.
      </p>
    </div>
  );
}

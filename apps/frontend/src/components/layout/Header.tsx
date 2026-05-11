'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useSaasContext } from '@/hooks/useSaasContext';
import { uiLabels, recetasPageTitle, reportesPageTitle } from '@/lib/ui-labels';
import { SaasPlanBadge } from '@/components/layout/SaasPlanBadge';
import { ChevronRight, Menu } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/':                 'Panel',
  '/clientes':         'Clientes',
  '/inventario':       'Inventario',
  '/ventas':           'Ventas',
  '/ventas/historial': 'Historial de ventas',
  '/ventas/cierres-caja': 'Cierres de caja',
  '/gastos':           'Gastos',
  '/empleados':        'Empleados',
  '/kits':             'Kits',
  '/proveedores':      'Proveedores',
  '/compras':          'Compras',
  '/devoluciones':     'Devoluciones',
  '/comprobante':      'Comprobante',
  '/configuracion':    'Configuración',
  '/tiendas':          'Tiendas',
  '/cajas':            'Cajas',
  '/auditoria':        'Auditoría',
  '/tarjeta-de-regalo': 'Tarjeta regalo',
  '/cotizaciones':     'Cotizaciones',
  '/promociones':      'Promociones',
};

function titleForPath(pathname: string): string {
  if (pathname === '/recetas') return recetasPageTitle();
  if (pathname === '/reportes') return reportesPageTitle();
  const fixed = PAGE_TITLES[pathname];
  if (fixed) return fixed;
  if (pathname.startsWith('/ventas/historial')) return 'Historial de ventas';
  if (pathname.startsWith('/ventas/cierres-caja')) return 'Cierres de caja';
  return 'Panel';
}

interface Props {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: Props) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);
  const title    = titleForPath(pathname);
  const { data: saasCtx, isSuccess: saasOk } = useSaasContext();

  return (
    <header className="h-16 bg-white/85 backdrop-blur-md border-b border-navy-200/40 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — solo móvil */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-navy-400 hidden sm:block">{uiLabels.breadcrumbRoot}</span>
          <ChevronRight size={14} className="text-navy-300 hidden sm:block" />
          <span className="font-semibold text-navy-800 font-display">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 min-w-0">
        {saasOk && saasCtx?.limits && saasCtx.usage ? (
          <SaasPlanBadge limits={saasCtx.limits} usage={saasCtx.usage} />
        ) : null}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold">
            {user?.nombre?.[0]?.toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-navy-800 leading-none">{user?.nombre}</p>
            <p className="text-xs text-navy-400 mt-0.5 capitalize leading-none">{user?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

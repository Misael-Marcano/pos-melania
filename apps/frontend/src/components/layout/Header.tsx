'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useSaasContext } from '@/hooks/useSaasContext';
import { useQueryClient } from '@tanstack/react-query';
import { SAAS_CONTEXT_KEY } from '@/hooks/useSaasContext';
import { useRouter } from 'next/navigation';
import { Building2, X } from 'lucide-react';
import { uiLabels, recetasPageTitle, reportesPageTitle } from '@/lib/ui-labels';
import { SaasPlanBadge } from '@/components/layout/SaasPlanBadge';
import { ChevronRight, Menu } from 'lucide-react';
import { UserMenu } from '@/components/layout/UserMenu';

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
  /** Estado del drawer móvil (menú lateral) para aria-expanded. */
  sidebarOpen?: boolean;
}

export function Header({ onToggleSidebar, sidebarOpen = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const title = titleForPath(pathname);
  const user = useAuthStore((s) => s.user);
  const platformTenantId = useAuthStore((s) => s.platformTenantId);
  const clearPlatformTenantId = useAuthStore((s) => s.clearPlatformTenantId);
  const { data: saasCtx, isSuccess: saasOk } = useSaasContext();

  const operatingOrg =
    user?.rol === 'plataforma' && platformTenantId != null && saasOk
      ? saasCtx?.tenant?.nombre
      : null;

  return (
    <header className="h-16 bg-white/85 backdrop-blur-md border-b border-navy-200/40 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — solo móvil */}
        <button
          type="button"
          data-sidebar-menu-trigger
          onClick={onToggleSidebar}
          aria-label="Menú de navegación"
          aria-expanded={sidebarOpen}
          aria-controls="dashboard-mobile-nav"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
        >
          <Menu size={20} aria-hidden />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-navy-400 hidden sm:block">{uiLabels.breadcrumbRoot}</span>
          <ChevronRight size={14} className="text-navy-300 hidden sm:block" />
          <span className="font-semibold text-navy-800 font-display">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {operatingOrg ? (
          <div className="hidden sm:flex items-center gap-1.5 max-w-[200px] px-2.5 py-1 rounded-lg bg-primary-50 border border-primary-100 text-xs text-primary-800">
            <Building2 size={13} className="shrink-0" aria-hidden />
            <span className="truncate font-medium" title={operatingOrg}>{operatingOrg}</span>
            <button
              type="button"
              onClick={() => {
                clearPlatformTenantId();
                void qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
                router.push('/plataforma');
              }}
              className="p-0.5 rounded hover:bg-primary-100 text-primary-600"
              aria-label="Salir de la organización"
            >
              <X size={12} />
            </button>
          </div>
        ) : null}
        {saasOk && saasCtx?.limits && saasCtx.usage ? (
          <SaasPlanBadge limits={saasCtx.limits} usage={saasCtx.usage} />
        ) : null}
        <UserMenu />
      </div>
    </header>
  );
}

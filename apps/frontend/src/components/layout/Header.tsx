'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { GlobalSearch } from '@/components/ui/GlobalSearch';

const PAGE_TITLES: Record<string, string> = {
  '/':              'Panel',
  '/clientes':      'Clientes',
  '/inventario':    'Inventario',
  '/ventas':        'Ventas',
  '/gastos':        'Gastos',
  '/empleados':     'Empleados',
  '/kits':          'Kits',
  '/proveedores':   'Proveedores',
  '/reportes':      'Reportes',
  '/comprobante':   'Comprobante',
  '/configuracion': 'Configuración',
  '/tiendas':       'Tiendas',
};

interface Props {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: Props) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);
  const title    = PAGE_TITLES[pathname] ?? 'Panel';

  return (
    <header className="h-16 bg-white shadow-[0_1px_0_0_#F1F4F3] flex items-center justify-between px-4 lg:px-6 shrink-0">
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
          <span className="text-navy-400 hidden sm:block">Sistema POS</span>
          <ChevronRight size={14} className="text-navy-300 hidden sm:block" />
          <span className="font-semibold text-navy-800 font-display">{title}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <GlobalSearch />

        <div className="flex items-center gap-2.5 pl-3 border-l border-navy-200/60">
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

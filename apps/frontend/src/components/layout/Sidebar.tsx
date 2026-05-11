'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Package, ShoppingCart, DollarSign,
  Users2, Gift, FileText, Settings, Store, Landmark, Truck, BarChart2,
  LogOut, Box, X, ClipboardList, RotateCcw, Shield, History,
  ChevronDown, Tag, ScrollText, ChefHat, Lock, Building2,
} from 'lucide-react';
import { Rol, PlanFeatures } from '@pos/shared';
import { useState, useEffect, useMemo } from 'react';
import { useStockBajo } from '@/hooks/useInventario';
import { useSaasContext } from '@/hooks/useSaasContext';
import { appBrand } from '@/lib/app-brand';
import { uiLabels } from '@/lib/ui-labels';

interface NavChild {
  label: string;
  href:  string;
  icon:  React.ReactNode;
  roles: Rol[];
}

interface NavItem {
  label:    string;
  href:     string;
  icon:     React.ReactNode;
  roles:    Rol[];
  children?: NavChild[];
  /** Si está definido, este item requiere que el plan tenga este feature habilitado. */
  feature?: keyof PlanFeatures;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Panel',          href: '/panel',             icon: <LayoutDashboard size={17} />, roles: ['admin','cajero','soporte','plataforma'] },
  { label: 'Clientes',       href: '/clientes',          icon: <Users size={17} />,           roles: ['admin','cajero','soporte','plataforma'] },
  { label: 'Inventario',     href: '/inventario',        icon: <Package size={17} />,         roles: ['admin','cajero','soporte','plataforma'] },
  { label: 'Recetas',        href: '/recetas',           icon: <ChefHat size={17} />,         roles: ['admin','cajero','soporte','plataforma'],   feature: 'recetas' },
  { label: 'Kits',           href: '/kits',              icon: <Box size={17} />,             roles: ['admin','soporte','plataforma'],             feature: 'kits' },
  { label: 'Proveedores',    href: '/proveedores',       icon: <Truck size={17} />,           roles: ['admin','soporte','plataforma'],             feature: 'compras' },
  { label: 'Compras',        href: '/compras',           icon: <ClipboardList size={17} />,   roles: ['admin','soporte','plataforma'],             feature: 'compras' },
  { label: 'Devoluciones',   href: '/devoluciones',      icon: <RotateCcw size={17} />,       roles: ['admin','soporte','plataforma'] },
  { label: 'Cotizaciones',   href: '/cotizaciones',      icon: <ScrollText size={17} />,     roles: ['admin','cajero','soporte','plataforma'],    feature: 'cotizaciones' },
  { label: 'Promociones',    href: '/promociones',       icon: <Tag size={17} />,            roles: ['admin','soporte','plataforma'],             feature: 'promociones' },
  { label: 'Reportes',       href: '/reportes',          icon: <BarChart2 size={17} />,       roles: ['admin','soporte','plataforma'] },
  {
    label: 'Ventas',
    href:  '/ventas',
    icon:  <ShoppingCart size={17} />,
    roles: ['admin','cajero','soporte','plataforma'],
    children: [
      { label: 'Nueva Venta',    href: '/ventas',                icon: <ShoppingCart size={14} />, roles: ['admin','cajero','plataforma'] },
      { label: 'Historial',      href: '/ventas/historial',      icon: <History size={14} />,      roles: ['admin','soporte','plataforma'] },
      { label: 'Cierres de Caja', href: '/ventas/cierres-caja', icon: <DollarSign size={14} />,   roles: ['admin','soporte','cajero','plataforma'] },
    ],
  },
  { label: 'Gastos',         href: '/gastos',            icon: <DollarSign size={17} />,      roles: ['admin','soporte','cajero','plataforma'] },
  { label: 'Empleados',      href: '/empleados',         icon: <Users2 size={17} />,          roles: ['admin','soporte','plataforma'] },
  { label: 'Tarjeta Regalo', href: '/tarjeta-de-regalo', icon: <Gift size={17} />,            roles: ['admin','cajero','plataforma'],             feature: 'tarjetasRegalo' },
  { label: 'Comprobante',    href: '/comprobante',       icon: <FileText size={17} />,        roles: ['admin','soporte','plataforma'] },
  { label: 'Configuración',  href: '/configuracion',     icon: <Settings size={17} />,        roles: ['admin','soporte','plataforma'] },
  { label: 'Tiendas',        href: '/tiendas',           icon: <Store size={17} />,           roles: ['admin','soporte','plataforma'] },
  { label: 'Cajas',          href: '/cajas',             icon: <Landmark size={17} />,        roles: ['admin','soporte','plataforma'] },
  { label: 'Auditoría',      href: '/auditoria',         icon: <Shield size={17} />,          roles: ['admin','plataforma'] },
  { label: 'Panel instancia', href: '/plataforma',       icon: <Building2 size={17} />,       roles: ['plataforma'] },
];

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);
  const logout   = useAuthStore((s) => s.logout);

  const isAdmin = user?.rol === 'admin' || user?.rol === 'plataforma';
  const { data: stockBajoData } = useStockBajo(10);
  const stockBajoCount = isAdmin ? (stockBajoData?.length ?? 0) : 0;
  const { data: saas } = useSaasContext();

  /** Devuelve true si el item está bloqueado por el plan del tenant. */
  const isLocked = (item: NavItem): boolean => {
    if (!item.feature) return false;
    // plataforma ve todo (gestión de la instancia)
    if (user?.rol === 'plataforma') return false;
    // Si no hay contexto SaaS aún, no bloquear (esperar)
    if (!saas) return false;
    return saas.limits.features[item.feature] === false;
  };

  const navItems = useMemo(
    () =>
      NAV_ITEMS
        .filter((i) => i.href !== '/recetas' || uiLabels.featureRecetas)
        .map((i) => {
        if (i.href === '/recetas') return { ...i, label: uiLabels.recetas };
        if (i.href === '/reportes') return { ...i, label: uiLabels.reportes };
        return i;
      }),
    [],
  );

  const visibleItems = navItems.filter((i) => user && i.roles.includes(user.rol));

  // Track which parent menus are open — auto-open if current path is a child
  const getInitialOpen = () => {
    const map: Record<string, boolean> = {};
    for (const item of navItems) {
      if (item.children) {
        map[item.href] = item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'));
      }
    }
    return map;
  };

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(getInitialOpen);

  // Re-evaluate when pathname changes (e.g. navigating programmatically)
  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };
      for (const item of navItems) {
        if (item.children) {
          const childActive = item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'));
          if (childActive) next[item.href] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setOpenMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const content = (
    <aside className="w-[240px] h-full bg-navy-700 flex flex-col shadow-sidebar">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
            <span className="text-white font-extrabold text-xs">POS</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">{appBrand.shortName}</p>
            {appBrand.tagline.trim() ? (
              <p className="text-white/40 text-[10px] mt-0.5 leading-none">{appBrand.tagline}</p>
            ) : null}
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-white/40 hover:text-white p-1 rounded-md">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleItems.map((item) => {

          // ── Item with submenu ───────────────────────────────────────────────
          if (item.children) {
            const visibleChildren = item.children.filter((c) => user && c.roles.includes(user.rol));
            if (visibleChildren.length === 0) return null;

            const isExpanded    = !!openMenus[item.href];
            const hasActiveChild = visibleChildren.some((c) => pathname === c.href);

            return (
              <div key={item.href}>
                {/* Parent button */}
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    'border-l-2 pl-[10px] pr-3',
                    hasActiveChild
                      ? 'text-white bg-white/10 border-primary-200'
                      : 'text-white/50 hover:text-white hover:bg-white/8 border-transparent'
                  )}
                >
                  <span className={cn(hasActiveChild ? 'text-white' : 'text-white/40')}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      'transition-transform duration-200 shrink-0',
                      hasActiveChild ? 'text-white/60' : 'text-white/30',
                      isExpanded ? 'rotate-180' : 'rotate-0'
                    )}
                  />
                </button>

                {/* Children */}
                {isExpanded && (
                  <div className="ml-4 pl-3 border-l border-white/10 space-y-0.5 mt-0.5 mb-1">
                    {visibleChildren.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                            'border-l-2 pl-[10px] pr-3',
                            childActive
                              ? 'bg-white/10 text-white border-primary-200'
                              : 'text-white/45 hover:text-white hover:bg-white/8 border-transparent'
                          )}
                        >
                          <span className={cn(childActive ? 'text-white' : 'text-white/35')}>
                            {child.icon}
                          </span>
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Regular item ────────────────────────────────────────────────────
          const active = item.href === '/panel'
            ? pathname === '/panel'
            : pathname === item.href || pathname.startsWith(item.href + '/');

          const badge = item.href === '/inventario' && stockBajoCount > 0 ? stockBajoCount : null;
          const locked = isLocked(item);

          if (locked) {
            return (
              <Link
                key={item.href}
                href="/configuracion"
                onClick={onClose}
                title={`Disponible desde plan Standard — ir a Configuración`}
                className={cn(
                  'flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  'border-l-2 pl-[10px] pr-3',
                  'text-white/25 hover:text-white/40 hover:bg-white/5 border-transparent cursor-not-allowed',
                )}
              >
                <span className="text-white/20">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <Lock size={11} className="text-white/25 shrink-0" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                'border-l-2 pl-[10px] pr-3',
                active
                  ? 'bg-white/10 text-white border-primary-200'
                  : 'text-white/50 hover:text-white hover:bg-white/8 border-transparent'
              )}
            >
              <span className={cn(active ? 'text-white' : 'text-white/40')}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {badge !== null && (
                <span className="ml-auto text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.nombre?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-none">{user?.nombre}</p>
            <p className="text-white/40 text-[10px] mt-1 capitalize leading-none">{user?.rol}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-sm transition-all duration-150"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">
        {content}
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-10 flex h-full">{content}</div>
        </div>
      )}
    </>
  );
}

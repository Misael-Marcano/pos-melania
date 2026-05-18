'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Package, ShoppingCart, DollarSign,
  Users2, Gift, FileText, Settings, Store, Landmark, Truck, BarChart2,
  Box, X, ClipboardList, RotateCcw, Shield, History,
  ChevronDown, Tag, ScrollText, ChefHat, Lock, Building2,
} from 'lucide-react';
import { Rol, PlanFeatures } from '@pos/shared';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Ref } from 'react';
import { useStockBajo } from '@/hooks/useInventario';
import { useSaasContext } from '@/hooks/useSaasContext';
import { appBrand } from '@/lib/app-brand';
import { uiLabels } from '@/lib/ui-labels';
import { NexoIcon } from './NexoIcon';

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
  { label: 'Reportes',       href: '/reportes',          icon: <BarChart2 size={17} />,       roles: ['admin','soporte','contador','plataforma'] },
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
  { label: 'Configuración',  href: '/configuracion',     icon: <Settings size={17} />,        roles: ['admin','soporte','contador','plataforma'] },
  { label: 'Tiendas',        href: '/tiendas',           icon: <Store size={17} />,           roles: ['admin','soporte','plataforma'] },
  { label: 'Cajas',          href: '/cajas',             icon: <Landmark size={17} />,        roles: ['admin','soporte','plataforma'] },
  { label: 'Auditoría',      href: '/auditoria',         icon: <Shield size={17} />,          roles: ['admin','plataforma'] },
  { label: 'Panel instancia', href: '/plataforma',       icon: <Building2 size={17} />,       roles: ['plataforma'] },
];

interface Props {
  open:    boolean;
  onClose: () => void;
}

/** Hijo cuya ruta coincide con el padre (p. ej. /ventas) solo activo en exact match. */
function isNavChildActive(pathname: string, childHref: string, parentHref: string): boolean {
  if (childHref === parentHref) return pathname === childHref;
  return pathname === childHref || pathname.startsWith(`${childHref}/`);
}

const navFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-700';

const FOCUSABLE_SELECTOR =
  'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest('[inert]') && !el.hasAttribute('disabled'),
  );
}

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);

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
        map[item.href] = item.children.some((c) => isNavChildActive(pathname, c.href, item.href));
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
          const childActive = item.children.some((c) => isNavChildActive(pathname, c.href, item.href));
          if (childActive) next[item.href] = true;
        }
      }
      return next;
    });
  }, [pathname, navItems]);

  const toggleMenu = (href: string) => {
    setOpenMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  /** Fila nav: borde izquierdo reservado en todos los estados (sin saltos al activar). */
  const navRow = cn(
    'relative flex items-center gap-3 rounded-lg text-sm font-medium',
    'border-l-[3px] border-transparent pl-2.5 pr-2.5',
    'transition-[color,background-color,border-color,transform] duration-200 motion-reduce:transition-none',
    navFocusRing,
  );
  const navInactive =
    'text-white/65 hover:text-white hover:bg-white/[0.06] active:scale-[0.995] motion-reduce:active:scale-100';
  /** Activo: superficie uniforme + acento mint sólido a la izquierda (sin gradiente ni resplandor). */
  const navActive =
    'border-primary-100 bg-white/[0.09] text-white font-semibold';
  /** Padre con hijo activo: acento discreto; el hijo lleva el mint pleno. */
  const navParentWithActive =
    'border-white/25 bg-white/[0.04] text-white font-medium hover:bg-white/[0.07]';

  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    const restoreFocus = open;
    onClose();
    if (restoreFocus) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[data-sidebar-menu-trigger]')?.focus();
      });
    }
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;

    const focusRaf = requestAnimationFrame(() => {
      mobileCloseRef.current?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = mobilePanelRef.current;
      if (!root) return;
      const list = getFocusableElements(root);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      const inside = root.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(focusRaf);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, handleClose]);

  const renderAside = (opts?: { closeButtonRef?: Ref<HTMLButtonElement> }) => (
    <aside className="w-[240px] h-full bg-gradient-to-b from-[#2f3d2f] via-navy-700 to-[#1f2c1f] flex flex-col shadow-sidebar border-r border-white/10">
      {/* Logo — enlace al panel (atajo habitual). */}
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-white/5">
        <Link
          href="/panel"
          onClick={handleClose}
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-xl py-1 pr-1 -ml-0.5 pl-0.5',
            'hover:bg-white/5 transition-colors duration-200 motion-reduce:transition-none',
            navFocusRing,
          )}
        >
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
            <NexoIcon className="w-5 h-5" ariaLabel="Nexo" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-white font-semibold text-sm leading-none truncate">{appBrand.shortName}</p>
            {appBrand.tagline.trim() ? (
              <p className="text-white/40 text-[10px] mt-0.5 leading-none truncate">{appBrand.tagline}</p>
            ) : null}
          </div>
        </Link>
        <button
          type="button"
          ref={opts?.closeButtonRef}
          onClick={handleClose}
          aria-label="Cerrar menú de navegación"
          className={cn(
            'lg:hidden shrink-0 text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5',
            'transition-colors duration-200 motion-reduce:transition-none',
            navFocusRing,
          )}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      {/* Nav */}
      <nav
        className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-1"
        aria-label="Navegación principal"
      >
        {visibleItems.map((item) => {

          // ── Item with submenu ───────────────────────────────────────────────
          if (item.children) {
            const visibleChildren = item.children.filter((c) => user && c.roles.includes(user.rol));
            if (visibleChildren.length === 0) return null;

            const isExpanded    = !!openMenus[item.href];
            const hasActiveChild = visibleChildren.some((c) => isNavChildActive(pathname, c.href, item.href));

            return (
              <div key={item.href}>
                {/* Parent button */}
                <button
                  type="button"
                  onClick={() => toggleMenu(item.href)}
                  aria-expanded={isExpanded}
                  className={cn(
                    navRow,
                    'w-full py-2 text-left',
                    hasActiveChild ? navParentWithActive : navInactive,
                  )}
                >
                  <span className={cn(hasActiveChild ? 'text-primary-100' : 'text-white/45')} aria-hidden>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden
                    className={cn(
                      'shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                      hasActiveChild ? 'text-primary-100/80' : 'text-white/30',
                      isExpanded ? 'rotate-180' : 'rotate-0'
                    )}
                  />
                </button>

                {/* Children */}
                {isExpanded && (
                  <div className="ml-2 mt-1 mb-1 space-y-0.5 border-l border-white/10 pl-2.5">
                    {visibleChildren.map((child) => {
                      const childActive = isNavChildActive(pathname, child.href, item.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={handleClose}
                          className={cn(
                            navRow,
                            'py-1.5 text-xs',
                            childActive ? navActive : navInactive,
                          )}
                        >
                          <span className={cn(childActive ? 'text-primary-100' : 'text-white/40')} aria-hidden>
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
                onClick={handleClose}
                title={`Disponible desde plan Standard — ir a Configuración`}
                className={cn(
                  navRow,
                  'py-2',
                  'text-white/25 hover:text-white/40 hover:bg-white/5 cursor-not-allowed',
                )}
              >
                <span className="text-white/20" aria-hidden>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <Lock size={11} className="text-white/25 shrink-0" aria-hidden />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClose}
              className={cn(
                navRow,
                'py-2',
                active ? navActive : navInactive,
              )}
            >
              <span className={cn(active ? 'text-primary-100' : 'text-white/45')} aria-hidden>
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
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">
        {renderAside()}
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
            onClick={handleClose}
          />
          <div
            ref={mobilePanelRef}
            id="dashboard-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menú lateral"
            className="relative z-10 flex h-full shadow-2xl"
          >
            {renderAside({ closeButtonRef: mobileCloseRef })}
          </div>
        </div>
      )}
    </>
  );
}

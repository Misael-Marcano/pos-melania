'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { SAAS_CONTEXT_KEY } from '@/hooks/useSaasContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { exitStaticDemo, isStaticDemoActive } from '@/lib/static-demo';
import { Portal } from '@/components/ui/Portal';
import { Rol } from '@pos/shared';
import {
  Building2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
} from 'lucide-react';

/** Mismas rutas que en el sidebar para no mostrar enlaces sin permiso. */
const ROLES_MENU_EXTRAS: readonly Rol[] = ['admin', 'soporte', 'plataforma'];

export function UserMenu() {
  const router = useRouter();
  const qc = useQueryClient();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const platformTenantId = useAuthStore((s) => s.platformTenantId);
  const clearPlatformTenantId = useAuthStore((s) => s.clearPlatformTenantId);
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  const showAdminLinks = user && ROLES_MENU_EXTRAS.includes(user.rol);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top:   r.bottom + 6,
      right: document.documentElement.clientWidth - r.right,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[data-user-menu-item]')?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!user) return null;

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-navy-700 hover:bg-navy-50 transition-colors outline-none focus-visible:bg-navy-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/25';

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        id="header-user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'header-user-menu' : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex max-w-[min(18rem,calc(100vw-10rem))] items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2',
          'hover:bg-navy-50/90 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2',
          open && 'bg-navy-50/90',
        )}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white"
          aria-hidden
        >
          {user.nombre?.[0]?.toUpperCase()}
        </div>
        <div className="hidden min-w-0 flex-1 text-left sm:block">
          <p className="truncate text-sm font-semibold leading-none text-navy-800">{user.nombre}</p>
          <p className="mt-0.5 truncate text-xs capitalize leading-none text-navy-400">{user.rol}</p>
        </div>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-navy-400 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <Portal>
          <div
            ref={menuRef}
            id="header-user-menu"
            role="menu"
            aria-labelledby="header-user-menu-trigger"
            style={{
              position: 'fixed',
              top:   coords.top,
              right: coords.right,
              zIndex: 200,
            }}
            className="glass-panel min-w-[15rem] py-1.5 shadow-float ring-1 ring-navy-900/[0.06]"
          >
            <Link
              href="/panel"
              role="menuitem"
              data-user-menu-item
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard size={17} className="shrink-0 text-navy-400" aria-hidden />
              Ir al panel
            </Link>
            {showAdminLinks ? (
              <Link
                href="/configuracion"
                role="menuitem"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <Settings size={17} className="shrink-0 text-navy-400" aria-hidden />
                Configuración
              </Link>
            ) : null}
            {showAdminLinks ? (
              <Link
                href="/comprobante"
                role="menuitem"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <FileText size={17} className="shrink-0 text-navy-400" aria-hidden />
                Comprobante
              </Link>
            ) : null}
            {user.rol === 'plataforma' ? (
              <Link
                href="/plataforma"
                role="menuitem"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <Building2 size={17} className="shrink-0 text-navy-400" aria-hidden />
                Panel instancia
              </Link>
            ) : null}
            {user.rol === 'plataforma' && platformTenantId != null ? (
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  setOpen(false);
                  clearPlatformTenantId();
                  void qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
                  router.push('/plataforma');
                }}
              >
                <Building2 size={17} className="shrink-0 text-navy-400" aria-hidden />
                Salir de organización
              </button>
            ) : null}
            <div className="my-1 h-px bg-navy-100" role="separator" aria-hidden />
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, 'text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500/20')}
              onClick={() => {
                setOpen(false);
                if (isStaticDemoActive()) {
                  exitStaticDemo();
                  router.push('/');
                  return;
                }
                void logout();
              }}
            >
              <LogOut size={17} className="shrink-0" aria-hidden />
              {isStaticDemoActive() ? 'Salir de la demo' : 'Cerrar sesión'}
            </button>
          </div>
        </Portal>
      )}
    </div>
  );
}

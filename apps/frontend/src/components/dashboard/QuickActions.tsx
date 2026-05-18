'use client';

import Link from 'next/link';
import { Clock, AlignJustify, ShoppingCart, BarChart2, RefreshCw, ArrowRight } from 'lucide-react';
import { uiLabels } from '@/lib/ui-labels';
import { useAuthStore } from '@/store/auth.store';
import { useSaasContext } from '@/hooks/useSaasContext';
import type { Rol, PlanFeatures } from '@pos/shared';

type ActionDef = {
  label:   string;
  icon:    React.ReactNode;
  href:    string;
  color:   string;
  roles:   Rol[];
  feature?: keyof PlanFeatures;
};

const ACTIONS: ActionDef[] = [
  { label: `Cierre de hoy · ${uiLabels.reportes}`, icon: <Clock size={16} />,        href: '/reportes',     color: 'bg-primary-100 text-primary-600', roles: ['admin', 'soporte', 'contador', 'plataforma'] },
  { label: 'Resumen de artículos de hoy',         icon: <AlignJustify size={16} />, href: '/inventario',   color: 'bg-primary-100 text-primary-600', roles: ['admin', 'soporte', 'plataforma'] },
  { label: 'Iniciar una nueva venta',             icon: <ShoppingCart size={16} />, href: '/ventas',       color: 'bg-primary-100 text-primary-700', roles: ['admin', 'cajero', 'plataforma'] },
  { label: `Ventas detalladas · ${uiLabels.reportes}`, icon: <BarChart2 size={16} />, href: '/reportes', color: 'bg-secondary-container text-secondary', roles: ['admin', 'soporte', 'contador', 'plataforma'] },
  { label: 'Nueva recepción de proveedor',        icon: <RefreshCw size={16} />,    href: '/compras',      color: 'bg-primary-50 text-primary-600',  roles: ['admin', 'soporte', 'plataforma'], feature: 'compras' },
];

export function QuickActions() {
  const user = useAuthStore((s) => s.user);
  const { data: saas } = useSaasContext();

  const visible = ACTIONS.filter((a) => {
    if (!user || !a.roles.includes(user.rol)) return false;
    if (user.rol === 'plataforma') return true;
    if (!a.feature) return true;
    return saas?.limits?.features?.[a.feature] !== false;
  });

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-navy-100/60 bg-white/40">
        <h3 className="font-bold text-navy-800 font-display text-base">Acciones rápidas</h3>
        <p className="text-xs text-navy-400 mt-0.5">Atajos del sistema</p>
      </div>
      <div className="p-2 space-y-0.5">
        {visible.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-navy-50/90 transition-colors group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
              {action.icon}
            </div>
            <span className="flex-1 text-sm text-navy-700 group-hover:text-navy-900 font-medium">{action.label}</span>
            <ArrowRight size={14} className="text-secondary shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
        {visible.length === 0 && (
          <p className="text-xs text-navy-400 px-3 py-4 text-center">Sin atajos para tu rol</p>
        )}
      </div>
    </div>
  );
}

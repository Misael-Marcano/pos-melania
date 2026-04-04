'use client';

import Link from 'next/link';
import { Clock, AlignJustify, ShoppingCart, BarChart2, RefreshCw, ArrowRight } from 'lucide-react';

const ACTIONS = [
  { label: 'Informe de cierre de hoy',              icon: <Clock size={16} />,          href: '/reportes',     color: 'bg-primary-100 text-primary-600' },
  { label: 'Resumen de artículos de hoy',            icon: <AlignJustify size={16} />,   href: '/inventario',   color: 'bg-blue-100 text-blue-600' },
  { label: 'Iniciar una nueva venta',                icon: <ShoppingCart size={16} />,   href: '/ventas',       color: 'bg-emerald-100 text-emerald-600' },
  { label: 'Informe de ventas detallado',            icon: <BarChart2 size={16} />,      href: '/reportes',     color: 'bg-amber-100 text-amber-600' },
  { label: 'Nueva recepción de proveedor',           icon: <RefreshCw size={16} />,      href: '/proveedores',  color: 'bg-rose-100 text-rose-600' },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="font-bold text-navy-800 font-display">Acciones rápidas</h3>
        <p className="text-xs text-navy-400 mt-0.5">Atajos del sistema</p>
      </div>
      <div className="divide-y divide-navy-100/40">
        {ACTIONS.map((action, i) => (
          <Link
            key={i}
            href={action.href}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-navy-50/70 transition-colors group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
              {action.icon}
            </div>
            <span className="flex-1 text-sm text-navy-700 group-hover:text-navy-900 font-medium">{action.label}</span>
            <ArrowRight size={14} className="text-navy-300 group-hover:text-primary-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}

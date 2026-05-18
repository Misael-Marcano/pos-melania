'use client';

import Link from 'next/link';
import { Landmark, ArrowRight } from 'lucide-react';
import { useCajasAbiertas } from '@/hooks/useVentas';
import { formatCurrency } from '@/lib/utils';

export function CajaAbiertaWidget() {
  const { data: abiertas = [], isLoading } = useCajasAbiertas();

  if (isLoading || abiertas.length === 0) return null;

  const primera = abiertas[0];

  return (
    <div className="bg-white rounded-[12px] shadow-card px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-primary-100/80">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
          <Landmark size={18} className="text-primary-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-800">
            {abiertas.length === 1 ? 'Caja abierta' : `${abiertas.length} cajas abiertas`}
          </p>
          <p className="text-xs text-navy-500 mt-0.5 truncate">
            {primera.cajaNombre ?? 'Caja'}
            {primera.tienda?.nombre ? ` · ${primera.tienda.nombre}` : ''}
            {' · '}
            apertura {formatCurrency(Number(primera.montoApertura))}
          </p>
        </div>
      </div>
      <Link
        href="/ventas/cierres-caja"
        className="btn-primary text-xs py-2 px-4 inline-flex items-center justify-center gap-1.5 shrink-0"
      >
        Ver cierres <ArrowRight size={14} />
      </Link>
    </div>
  );
}

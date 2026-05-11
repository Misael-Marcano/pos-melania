'use client';

import { AlertTriangle, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useStockBajo } from '@/hooks/useInventario';

export function StockBajoWidget() {
  const { data, isLoading } = useStockBajo();

  return (
    <div className="bg-white rounded-[12px] shadow-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy-800">Stock bajo</h3>
            {(data?.length ?? 0) > 0 && (
              <p className="text-xs text-amber-500 font-medium">{data!.length} artículo{data!.length !== 1 ? 's' : ''} crítico{data!.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <Link href="/inventario"
          className="flex items-center gap-1 text-xs text-secondary font-medium hover:opacity-90 transition-opacity">
          Ver todo <ArrowRight size={12} />
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-navy-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Package size={32} className="mb-2 text-navy-200" />
            <p className="text-sm font-medium text-navy-500">Inventario en orden</p>
            <p className="text-xs text-navy-400 mt-0.5">Todos los artículos tienen stock suficiente</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5 px-2 pb-2">
            {data.map((art) => (
              <li key={art.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-navy-50/80 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  art.cantidad === 0 ? 'bg-rose-500' : 'bg-amber-400'
                }`} />
                <span className="text-sm text-navy-700 truncate flex-1">{art.nombre}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  art.cantidad === 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {art.cantidad === 0 ? 'Agotado' : `${art.cantidad} uds`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(data?.length ?? 0) > 0 && (
        <div className="px-5 py-3 bg-navy-50/50 rounded-b-[12px]">
          <p className="text-xs text-navy-400">
            Revisa y repone el inventario para evitar pérdidas de venta
          </p>
        </div>
      )}
    </div>
  );
}

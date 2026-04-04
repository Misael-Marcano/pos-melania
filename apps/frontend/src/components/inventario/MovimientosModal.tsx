'use client';

import { useState } from 'react';
import { Modal }    from '@/components/ui/Modal';
import { useMovimientosInventario } from '@/hooks/useInventario';
import { IArticulo, IMovimientoInventario } from '@pos/shared';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  open:     boolean;
  onClose:  () => void;
  articulo: IArticulo | null;
}

const TIPO_LABEL: Record<IMovimientoInventario['tipo'], string> = {
  VENTA:          'Venta',
  DEVOLUCION:     'Devolución',
  AJUSTE:         'Ajuste',
  COMPRA:         'Compra',
  ENTRADA_MANUAL: 'Entrada manual',
  SALIDA_MANUAL:  'Salida manual',
};

const TIPO_COLOR: Record<IMovimientoInventario['tipo'], string> = {
  VENTA:          'bg-red-100 text-red-700',
  DEVOLUCION:     'bg-emerald-100 text-emerald-700',
  AJUSTE:         'bg-blue-100 text-blue-700',
  COMPRA:         'bg-purple-100 text-purple-700',
  ENTRADA_MANUAL: 'bg-emerald-100 text-emerald-700',
  SALIDA_MANUAL:  'bg-amber-100 text-amber-700',
};

export function MovimientosModal({ open, onClose, articulo }: Props) {
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useMovimientosInventario(articulo?.id ?? 0, page, limit);

  const movimientos = data?.data ?? [];
  const total       = data?.pagination?.total ?? 0;
  const totalPages  = Math.ceil(total / limit);

  return (
    <Modal open={open} onClose={onClose} title={`Movimientos — ${articulo?.nombre ?? ''}`} size="lg">
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-10 bg-navy-50 rounded animate-pulse" />
            ))}
          </div>
        ) : !movimientos.length ? (
          <p className="text-center text-navy-400 py-8">Sin movimientos registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100/40 text-left">
                  <th className="pb-2 pr-3 text-navy-500 font-medium">Fecha</th>
                  <th className="pb-2 pr-3 text-navy-500 font-medium">Tipo</th>
                  <th className="pb-2 pr-3 text-navy-500 font-medium text-right">Cantidad</th>
                  <th className="pb-2 pr-3 text-navy-500 font-medium text-right">Antes</th>
                  <th className="pb-2 pr-3 text-navy-500 font-medium text-right">Después</th>
                  <th className="pb-2 text-navy-500 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-navy-50/50">
                    <td className="py-2 pr-3 text-navy-600 whitespace-nowrap">
                      {format(new Date(m.createdAt), 'dd MMM yy HH:mm', { locale: es })}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[m.tipo]}`}>
                        {TIPO_LABEL[m.tipo]}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className={`flex items-center justify-end gap-1 font-semibold ${m.cantidad >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.cantidad >= 0
                          ? <ArrowUp size={13} />
                          : <ArrowDown size={13} />}
                        {Math.abs(m.cantidad)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-navy-500">{m.stockAntes}</td>
                    <td className="py-2 pr-3 text-right text-navy-700 font-medium">{m.stockDespues}</td>
                    <td className="py-2 text-navy-500 text-xs">{m.usuario?.nombre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-navy-100/40">
            <span className="text-xs text-navy-400">{total} movimientos</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-navy-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-navy-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-navy-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

'use client';

import { formatCurrency } from '@/lib/utils';
import type { ConciliacionCajaItem } from '@/services/reportes.service';

export function ConciliacionCajaTable({
  items,
  loading,
}: {
  items: ConciliacionCajaItem[];
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-100/40">
        <h3 className="font-semibold text-navy-800">Conciliación de cierres</h3>
        <p className="text-xs text-navy-500 mt-1">
          Conteo físico vs efectivo esperado (apertura + ventas efectivo − gastos).
        </p>
      </div>
      <div className="overflow-x-auto p-4">
        {loading ? (
          <p className="text-sm text-navy-400">Cargando conciliación…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-navy-400">Sin cierres en el rango.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-500 border-b border-navy-100">
                <th className="pb-2 pr-3">Caja</th>
                <th className="pb-2 pr-3 text-right">Ventas</th>
                <th className="pb-2 pr-3 text-right">Esperado</th>
                <th className="pb-2 pr-3 text-right">Conteo</th>
                <th className="pb-2 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.aperturaId} className="border-b border-navy-50">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-navy-800">{c.cajaNombre}</span>
                    <span className="block text-[10px] text-navy-400">#{c.aperturaId}</span>
                  </td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(c.totalVentas)}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(c.efectivoEsperado)}</td>
                  <td className="py-2 pr-3 text-right">
                    {c.montoCierre != null ? formatCurrency(c.montoCierre) : '—'}
                  </td>
                  <td className={`py-2 text-right font-semibold ${
                    c.diferencia == null ? 'text-navy-400'
                      : c.cuadra ? 'text-emerald-600'
                        : 'text-red-600'
                  }`}>
                    {c.diferencia != null
                      ? `${c.diferencia >= 0 ? '+' : ''}${formatCurrency(c.diferencia)}`
                      : '—'}
                    {c.alerta && (
                      <span className="block text-[10px] font-normal">{c.alerta}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

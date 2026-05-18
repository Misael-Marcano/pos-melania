'use client';

import { useVentasPorUsuario, useVentasPorCaja } from '@/hooks/useReportes';
import { formatCurrency } from '@/lib/utils';
import { ClipboardList, Store } from 'lucide-react';
import {
  downloadCSV, BarChartSimple, StatCard, LoadingCard, QueryError,
} from '@/components/reportes/reportes-shared';

// ── Tab: Auditoría ────────────────────────────────────────────────────────────

export function TabAuditoria({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
  const { data: porUsuario = [], isLoading: lu, isError: eu, error: errU, refetch: ru } =
    useVentasPorUsuario(desde, hasta, tiendaId);
  const { data: porCaja = [], isLoading: lc, isError: ec, error: errC, refetch: rc } =
    useVentasPorCaja(desde, hasta, tiendaId);

  if (lu || lc) return <LoadingCard />;
  if (eu) return <QueryError message={errU instanceof Error ? errU.message : 'Error'} onRetry={() => ru()} />;
  if (ec) return <QueryError message={errC instanceof Error ? errC.message : 'Error'} onRetry={() => rc()} />;

  return (
    <div className="space-y-5">
      <p className="text-sm text-navy-500 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
        Ventas activas (sin anuladas) en el período. Enlace a cierres en la pestaña Por sucursal.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-100/40 flex items-center gap-2 font-semibold text-navy-800 text-sm">
            <ClipboardList size={15} className="text-primary-500" /> Por cajero
          </div>
          <div className="overflow-x-auto">
            {porUsuario.length === 0 ? (
              <p className="text-sm text-navy-400 p-4">Sin ventas en el período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 px-4">Cajero</th>
                    <th className="py-2 px-4 text-center">Trans.</th>
                    <th className="py-2 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porUsuario.map((u) => (
                    <tr key={u.usuarioId} className="border-b border-navy-50">
                      <td className="py-2 px-4 font-medium text-navy-800">{u.usuarioNombre}</td>
                      <td className="py-2 px-4 text-center">{u.transacciones}</td>
                      <td className="py-2 px-4 text-right font-semibold">{formatCurrency(Number(u.totalMonto))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-100/40 flex items-center gap-2 font-semibold text-navy-800 text-sm">
            <Store size={15} className="text-primary-500" /> Por caja
          </div>
          <div className="overflow-x-auto">
            {porCaja.length === 0 ? (
              <p className="text-sm text-navy-400 p-4">Sin ventas en el período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-navy-500 border-b border-navy-100">
                    <th className="py-2 px-4">Caja</th>
                    <th className="py-2 px-4 text-center">Trans.</th>
                    <th className="py-2 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porCaja.map((c, i) => (
                    <tr key={`${c.cajaNombre}-${i}`} className="border-b border-navy-50">
                      <td className="py-2 px-4">
                        <p className="font-medium text-navy-800">{c.cajaNombre}</p>
                        {c.tiendaNombre && <p className="text-xs text-navy-400">{c.tiendaNombre}</p>}
                      </td>
                      <td className="py-2 px-4 text-center">{c.transacciones}</td>
                      <td className="py-2 px-4 text-right font-semibold">{formatCurrency(Number(c.totalMonto))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useConciliacionCaja, useResumenPorSucursal } from '@/hooks/useReportes';
import { useTiendas } from '@/hooks/useTiendas';
import { useAuthStore } from '@/store/auth.store';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Calendar, Store } from 'lucide-react';
import {
  downloadCSV, BarChartSimple, StatCard, LoadingCard, QueryError,
} from '@/components/reportes/reportes-shared';
import { ConciliacionCajaTable } from '@/components/reportes/ConciliacionCajaTable';

// ── Tab: Por sucursal ─────────────────────────────────────────────────────────

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', CREDITO: 'Crédito',
};

export function TabPorSucursal({ desde, hasta }: { desde: string; hasta: string }) {
  const { data: tiendas = [] } = useTiendas();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';
  const [tiendaId, setTiendaId] = useState<number | ''>('');

  useEffect(() => {
    if (!isAdmin && user?.tiendaId) setTiendaId(user.tiendaId);
  }, [isAdmin, user?.tiendaId]);

  const tid = tiendaId === '' ? null : Number(tiendaId);
  const { data, isLoading, isError, error } = useResumenPorSucursal(tid, desde, hasta);
  const { data: conciliaciones = [], isLoading: loadingConc } = useConciliacionCaja(desde, hasta, tid);

  return (
    <div className="space-y-5">
      <div className="bg-amber-50/80 border border-amber-100 rounded-[12px] px-4 py-3 text-sm text-amber-900">
        Las ventas cuentan solo si están ligadas a una sesión de caja de la sucursal. Los gastos usan el campo sucursal del registro.
      </div>

      <div className="bg-white rounded-[12px] shadow-card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-navy-600 block mb-1">Sucursal</label>
          {!isAdmin && user?.tiendaId ? (
            <p className="input-field w-64 bg-navy-50 text-navy-700 cursor-default">
              {tiendas.find((t) => t.id === user.tiendaId)?.nombre ?? `Sucursal #${user.tiendaId}`}
            </p>
          ) : (
            <Select
              wrapperClassName="w-64 shrink-0"
              value={tiendaId === '' ? '' : String(tiendaId)}
              onChange={(e) => setTiendaId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Seleccionar…</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {tiendaId === '' && (
        <p className="text-sm text-navy-500">Selecciona una sucursal para ver totales y desgloses.</p>
      )}

      {tiendaId !== '' && isLoading && <LoadingCard />}
      {tiendaId !== '' && isError && (
        <p className="text-rose-600 text-sm">{error instanceof Error ? error.message : 'Error'}</p>
      )}

      {tiendaId !== '' && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Ventas (período)"
              value={formatCurrency(Number(data.ventas.total))}
              sub={`${data.ventas.transacciones} transacciones`}
              icon={<BarChart3 size={18} className="text-primary-600" />}
              color="bg-primary-100"
            />
            <StatCard
              label="Gastos (período)"
              value={formatCurrency(Number(data.gastos.total))}
              sub={`${data.gastos.registros} registros`}
              icon={<Calendar size={18} className="text-rose-500" />}
              color="bg-rose-100"
            />
            <div className="rounded-xl border shadow-card p-4 flex items-center gap-4 bg-white border-navy-100 sm:col-span-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-100">
                <Store size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-navy-400">Sucursal</p>
                <p className="text-lg font-bold text-navy-800">{data.tienda.nombre}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-[12px] shadow-card">
              <div className="px-5 py-4 border-b border-navy-100/40 font-semibold text-navy-800">Ventas por método</div>
              <div className="p-4 space-y-2">
                {data.ventasPorMetodo.length === 0 ? (
                  <p className="text-sm text-navy-400">Sin ventas en el rango.</p>
                ) : (
                  data.ventasPorMetodo.map((row) => (
                    <div key={row.metodoPago} className="flex justify-between text-sm">
                      <span className="text-navy-600">{METODO_LABEL[row.metodoPago] ?? row.metodoPago}</span>
                      <span className="font-semibold text-navy-800">{formatCurrency(Number(row.total))}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-white rounded-[12px] shadow-card">
              <div className="px-5 py-4 border-b border-navy-100/40 font-semibold text-navy-800">Gastos por categoría</div>
              <div className="p-4 space-y-2">
                {data.gastosPorCategoria.length === 0 ? (
                  <p className="text-sm text-navy-400">Sin gastos en el rango.</p>
                ) : (
                  data.gastosPorCategoria.map((row) => (
                    <div key={row.categoria} className="flex justify-between text-sm">
                      <span className="text-navy-600">{row.categoria}</span>
                      <span className="font-semibold text-rose-600">{formatCurrency(Number(row.total))}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <ConciliacionCajaTable items={conciliaciones} loading={loadingConc} />

          <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-navy-100/40 font-semibold text-navy-800">
              Sesiones de caja (aperturas / cierres en el período)
            </div>
            <div className="overflow-x-auto p-4">
              {data.sesionesCaja.length === 0 ? (
                <p className="text-sm text-navy-400">No hay sesiones en el rango.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-navy-500 border-b border-navy-100">
                      <th className="pb-2 pr-3">Caja</th>
                      <th className="pb-2 pr-3">Estado</th>
                      <th className="pb-2 pr-3 text-right">Apertura</th>
                      <th className="pb-2 pr-3 text-right">Cierre</th>
                      <th className="pb-2 text-right">Monto cierre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sesionesCaja.map((s) => (
                      <tr key={s.id} className="border-b border-navy-50">
                        <td className="py-2 pr-3 font-medium text-navy-800">{s.cajaNombre}</td>
                        <td className="py-2 pr-3">
                          {s.abierta ? (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Abierta</span>
                          ) : (
                            <span className="text-xs font-semibold text-navy-600 bg-navy-100 px-2 py-0.5 rounded-full">Cerrada</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right text-navy-600 text-xs whitespace-nowrap">
                          {new Date(s.fechaApertura).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right text-navy-600 text-xs whitespace-nowrap">
                          {s.fechaCierre ? new Date(s.fechaCierre).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {s.montoCierre != null ? formatCurrency(Number(s.montoCierre)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


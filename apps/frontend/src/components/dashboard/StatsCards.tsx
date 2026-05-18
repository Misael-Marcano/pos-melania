'use client';

import { useState, useMemo } from 'react';
import { ShoppingCart, TrendingDown, AlertTriangle, DollarSign, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useResumenDia } from '@/hooks/useReportes';
import { useDashboardCurrency } from '@/hooks/useDashboardCurrency';
import { formatCurrency } from '@/lib/utils';
import { QueryError } from '@/components/reportes/reportes-shared';

function StatCard({
  label, value, sub, icon, color, alert,
}: {
  label:   string;
  value:   string | number;
  sub?:    string;
  icon:    React.ReactNode;
  color:   string;
  alert?:  boolean;
}) {
  return (
    <div className="relative bg-white rounded-[12px] shadow-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4 overflow-hidden transition-shadow duration-200 hover:shadow-card-hover">
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-navy-200/30 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-medium text-navy-500 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-base sm:text-xl lg:text-2xl font-bold mt-0.5 truncate font-display ${alert ? 'text-rose-600' : 'text-navy-800'}`}>
          {typeof value === 'number' ? value.toLocaleString('es-DO') : value}
        </p>
        {sub && <p className="text-[10px] sm:text-xs text-navy-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function stepDate(base: string, delta: number) {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function pctChange(actual: number, prev: number): string | null {
  if (prev <= 0 && actual <= 0) return null;
  if (prev <= 0) return '+100% vs día anterior';
  const pct = ((actual - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% vs día anterior`;
}

interface Props {
  stockCount: number;
  tiendaId?: number | null;
}

export function StatsCards({ stockCount, tiendaId = null }: Props) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayStr);
  const isHoy = fecha === todayStr;
  const fechaAnterior = stepDate(fecha, -1);

  const { symbol } = useDashboardCurrency();
  const { data: resumen, isError, error, refetch, isLoading } = useResumenDia(fecha, tiendaId);
  const { data: resumenPrev } = useResumenDia(fechaAnterior, tiendaId);

  const transacciones = Number(resumen?.totalTransacciones ?? 0);
  const totalVentas   = Number(resumen?.totalVentas        ?? 0);
  const totalEfectivo = Number(resumen?.totalEfectivo      ?? 0);
  const totalGastos   = Number(resumen?.totalGastos        ?? 0);
  const prevVentas    = Number(resumenPrev?.totalVentas ?? 0);

  const labelFecha = isHoy ? 'Hoy' : new Date(fecha + 'T12:00:00').toLocaleDateString('es-DO', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const ventasDelta = useMemo(
    () => pctChange(totalVentas, prevVentas),
    [totalVentas, prevVentas],
  );

  const errorMsg = error instanceof Error ? error.message : 'No se pudo cargar el resumen';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFecha(stepDate(fecha, -1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-ambient text-navy-500 hover:bg-navy-50 transition-colors"
          aria-label="Día anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} className="text-navy-400" aria-hidden />
          <input
            type="date"
            value={fecha}
            max={todayStr}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            className="text-xs font-medium text-navy-700 border-0 bg-transparent focus:outline-none cursor-pointer"
            aria-label="Fecha del resumen"
          />
          <span className="text-xs text-navy-400">({labelFecha})</span>
        </div>
        <button
          type="button"
          onClick={() => setFecha(stepDate(fecha, 1))}
          disabled={isHoy}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-ambient text-navy-500 hover:bg-navy-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Día siguiente"
        >
          <ChevronRight size={14} />
        </button>
        {!isHoy && (
          <button
            type="button"
            onClick={() => setFecha(todayStr)}
            className="text-xs text-primary-600 font-medium hover:underline ml-1"
          >
            Hoy
          </button>
        )}
      </div>

      {isError && (
        <QueryError message={errorMsg} onRetry={() => void refetch()} />
      )}

      {!isError && (
        <div className={`grid grid-cols-2 xl:grid-cols-4 gap-4 ${isLoading ? 'opacity-60' : ''}`}>
          <StatCard
            label={isHoy ? 'Ventas hoy' : `Ventas ${labelFecha}`}
            value={transacciones}
            sub={
              ventasDelta
                ? `${transacciones === 1 ? '1 transacción' : `${transacciones} transacciones`} · ${ventasDelta}`
                : transacciones === 1 ? '1 transacción' : `${transacciones} transacciones`
            }
            icon={<ShoppingCart size={20} className="text-primary-600" />}
            color="bg-primary-50"
          />
          <StatCard
            label={isHoy ? 'Ingresos hoy' : `Ingresos ${labelFecha}`}
            value={formatCurrency(totalVentas, symbol)}
            sub={totalEfectivo > 0 ? `${formatCurrency(totalEfectivo, symbol)} en efectivo` : 'sin ventas aún'}
            icon={<DollarSign size={20} className="text-emerald-600" />}
            color="bg-emerald-50"
          />
          <StatCard
            label={isHoy ? 'Gastos hoy' : `Gastos ${labelFecha}`}
            value={formatCurrency(totalGastos, symbol)}
            sub={totalVentas > 0 && totalGastos > 0
              ? `${((totalGastos / totalVentas) * 100).toFixed(1)}% de ingresos`
              : 'sin gastos registrados'}
            icon={<TrendingDown size={20} className="text-amber-600" />}
            color="bg-amber-50"
          />
          <StatCard
            label="Stock bajo"
            value={stockCount}
            sub={stockCount === 0 ? 'inventario en orden' : `artículo${stockCount !== 1 ? 's' : ''} crítico${stockCount !== 1 ? 's' : ''}`}
            icon={<AlertTriangle size={20} className={stockCount > 0 ? 'text-rose-500' : 'text-navy-300'} />}
            color={stockCount > 0 ? 'bg-rose-50' : 'bg-navy-50'}
            alert={stockCount > 0}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { useCompararPeriodos } from '@/hooks/useReportes';
import { formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react';
import { QueryError } from '@/components/reportes/reportes-shared';

function VariacionBadge({ pct, pts }: { pct: number | null; pts?: number }) {
  if (pts != null) {
    const up = pts > 0;
    const flat = pts === 0;
    const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
    const cls = flat ? 'text-navy-500 bg-navy-100' : up ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${cls}`}>
        <Icon size={12} />
        {pts > 0 ? '+' : ''}{pts} pp
      </span>
    );
  }
  if (pct === null) {
    return <span className="text-xs text-navy-400">nuevo</span>;
  }
  const up = pct > 0;
  const flat = pct === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const cls = flat ? 'text-navy-500 bg-navy-100' : up ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${cls}`}>
      <Icon size={12} />
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

function CompareCell({
  label, actual, anterior, pct, pts,
}: {
  label: string;
  actual: string;
  anterior: string;
  pct?: number | null;
  pts?: number;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <p className="text-xs text-navy-400 font-medium">{label}</p>
      <p className="text-sm font-bold text-navy-800 truncate">{actual}</p>
      <p className="text-[11px] text-navy-400">vs {anterior}</p>
      <VariacionBadge pct={pct ?? null} pts={pts} />
    </div>
  );
}

type Mode = 'ventas' | 'pnl';

export function PeriodCompareBanner({
  referencia,
  tiendaId,
  mode,
}: {
  referencia: string;
  tiendaId?: number | null;
  mode: Mode;
}) {
  const { data, isLoading, isError, error, refetch } = useCompararPeriodos(referencia, tiendaId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 bg-white rounded-[12px] shadow-card border border-navy-100/60">
        <Loader2 className="animate-spin text-primary-400" size={20} />
      </div>
    );
  }
  if (isError) {
    return (
      <QueryError
        message={error instanceof Error ? error.message : 'Error al comparar períodos'}
        onRetry={() => refetch()}
      />
    );
  }
  if (!data) return null;

  const { actual, anterior, variacion, nota } = data;

  return (
    <div className="bg-white rounded-[12px] shadow-card border border-primary-100/80 overflow-hidden">
      <div className="px-5 py-3 border-b border-navy-100/40 bg-primary-50/40">
        <p className="font-semibold text-navy-800 text-sm">Comparación MTD</p>
        <p className="text-xs text-navy-500 mt-0.5">
          {actual.etiqueta} ({actual.desde} → {actual.hasta}) vs {anterior.etiqueta} ({anterior.desde} → {anterior.hasta})
        </p>
        <p className="text-[11px] text-navy-400 mt-1">{nota}</p>
      </div>
      <div className="grid gap-4 p-5 grid-cols-2 sm:grid-cols-3">
        {mode === 'ventas' ? (
          <>
            <CompareCell
              label="Ventas"
              actual={formatCurrency(actual.ventas.totalMonto)}
              anterior={formatCurrency(anterior.ventas.totalMonto)}
              pct={variacion.totalMontoPct}
            />
            <CompareCell
              label="Transacciones"
              actual={String(actual.ventas.totalVentas)}
              anterior={String(anterior.ventas.totalVentas)}
              pct={variacion.transaccionesPct}
            />
            <CompareCell
              label="Ticket promedio"
              actual={formatCurrency(actual.ventas.ticketPromedio)}
              anterior={formatCurrency(anterior.ventas.ticketPromedio)}
              pct={variacion.ticketPromedioPct}
            />
          </>
        ) : (
          <>
            <CompareCell
              label="Ingresos"
              actual={formatCurrency(actual.pnl.ingresos)}
              anterior={formatCurrency(anterior.pnl.ingresos)}
              pct={variacion.ingresosPct}
            />
            <CompareCell
              label="Utilidad neta"
              actual={formatCurrency(actual.pnl.utilidadNeta)}
              anterior={formatCurrency(anterior.pnl.utilidadNeta)}
              pct={variacion.utilidadNetaPct}
            />
            <CompareCell
              label="Margen neto"
              actual={`${actual.pnl.margenNeto.toFixed(1)}%`}
              anterior={`${anterior.pnl.margenNeto.toFixed(1)}%`}
              pts={variacion.margenNetoPts}
            />
          </>
        )}
      </div>
    </div>
  );
}



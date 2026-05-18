'use client';

import { useGanancias } from '@/hooks/useReportes';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Download } from 'lucide-react';
import {
  downloadCSV, BarChartSimple, StatCard, LoadingCard, QueryError,
} from '@/components/reportes/reportes-shared';
import { PeriodCompareBanner } from '@/components/reportes/PeriodCompareBanner';

// ── Tab: P&L ──────────────────────────────────────────────────────────────────

function PnLRow({ label, value, indent, bold, negative, positive, separator }: {
  label: string; value: number; indent?: boolean; bold?: boolean;
  negative?: boolean; positive?: boolean; separator?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-5 ${separator ? 'border-t border-navy-200 mt-1' : 'border-b border-navy-50'}`}>
      <span className={`text-sm ${indent ? 'pl-4 text-navy-500' : ''} ${bold ? 'font-bold text-navy-800' : 'text-navy-600'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${
        negative ? 'text-rose-600' :
        positive ? 'text-emerald-600' :
        bold     ? 'text-navy-800' : 'text-navy-700'
      }`}>
        {negative && value > 0 ? '(' : ''}{formatCurrency(Math.abs(value))}{negative && value > 0 ? ')' : ''}
      </span>
    </div>
  );
}

export function TabPnL({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
  const { data: pnl, isLoading, isError, error, refetch } = useGanancias(desde, hasta, tiendaId);

  if (isLoading) return <LoadingCard />;
  if (isError) return <QueryError message={error instanceof Error ? error.message : 'Error al cargar P&L'} onRetry={() => refetch()} />;
  if (!pnl) return <p className="text-center text-navy-400 text-sm py-8">Sin datos</p>;

  const exportarPnL = () => {
    downloadCSV(`pnl_${desde}_${hasta}.csv`,
      ['Concepto', 'Monto'],
      [
        ['Ventas brutas',    pnl.ingresos],
        ['Devoluciones',    -pnl.devoluciones],
        ['Costo de ventas', -pnl.costoVentas],
        ['Utilidad bruta',   pnl.utilidadBruta],
        ['Total gastos',    -pnl.gastos],
        ['Utilidad neta',    pnl.utilidadNeta],
        ['Margen bruto %',   pnl.margenBruto.toFixed(2)],
        ['Margen neto %',    pnl.margenNeto.toFixed(2)],
      ]
    );
  };

  return (
    <div className="space-y-4">
      <PeriodCompareBanner referencia={hasta} tiendaId={tiendaId} mode="pnl" />
      <p className="text-xs text-navy-500 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
        El costo usa el costo actual del artículo; las devoluciones por fecha de aprobación.
        Los pagos mixtos se desglosan según el detalle registrado en cada venta.
      </p>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Estado de resultados */}
      <div className="lg:col-span-2 bg-white rounded-[12px] shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-100/40 flex items-center gap-2.5">
          <DollarSign size={16} className="text-primary-500" />
          <span className="font-semibold text-navy-800">Estado de resultados</span>
          <span className="text-xs text-navy-400">{pnl.desde} → {pnl.hasta}</span>
          <button onClick={exportarPnL}
            className="ml-auto flex items-center gap-1.5 text-xs text-navy-500 hover:text-primary-600 font-medium transition-colors border border-navy-200 hover:border-primary-400 px-3 py-1.5 rounded-lg">
            <Download size={12} /> Exportar CSV
          </button>
        </div>

        <div className="py-1">
          <div className="px-5 py-1.5 bg-navy-50/40">
            <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Ingresos</p>
          </div>
          <PnLRow label="Ventas brutas"    value={pnl.ingresos} />
          <PnLRow label="Devoluciones"     value={pnl.devoluciones} indent negative />
          <PnLRow label="Costo de ventas"  value={pnl.costoVentas} indent negative />
          <PnLRow label="Utilidad bruta"   value={pnl.utilidadBruta} bold
            positive={pnl.utilidadBruta >= 0} negative={pnl.utilidadBruta < 0} separator />

          <div className="px-5 py-1.5 bg-navy-50/40 mt-2">
            <p className="text-xs font-bold text-navy-400 uppercase tracking-wider">Gastos operativos</p>
          </div>
          <PnLRow label="Total gastos" value={pnl.gastos} indent negative />

          <PnLRow label="Utilidad neta" value={pnl.utilidadNeta} bold
            positive={pnl.utilidadNeta >= 0} negative={pnl.utilidadNeta < 0} separator />
        </div>

        {/* Márgenes */}
        <div className="grid grid-cols-2 divide-x divide-navy-100 border-t border-navy-100/40">
          <div className="p-4 text-center">
            <p className="text-xs text-navy-400 mb-1">Margen bruto</p>
            <p className={`text-2xl font-bold ${pnl.margenBruto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pnl.margenBruto.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-navy-400 mb-1">Margen neto</p>
            <p className={`text-2xl font-bold ${pnl.margenNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pnl.margenNeto.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="space-y-5">
        {/* Ventas por método de pago */}
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-100/40">
            <p className="font-semibold text-navy-800 text-sm">Por método de pago</p>
          </div>
          <div className="p-4 space-y-2">
            {pnl.ventasPorMetodo.length === 0
              ? <p className="text-xs text-navy-400 text-center py-2">Sin datos</p>
              : pnl.ventasPorMetodo.map((m, i) => {
                const pct = pnl.ingresos > 0 ? (Number(m.total) / pnl.ingresos) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-navy-600 font-medium">{m.metodoPago}</span>
                      <span className="text-navy-700 font-semibold">{formatCurrency(Number(m.total))}</span>
                    </div>
                    <div className="w-full bg-navy-100 rounded-full h-1.5">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-navy-400 mt-0.5">{m.cantidad} transacciones · {pct.toFixed(1)}%</p>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-100/40">
            <p className="font-semibold text-navy-800 text-sm">Gastos por categoría</p>
          </div>
          <div className="p-4 space-y-2">
            {pnl.gastosPorCategoria.length === 0
              ? <p className="text-xs text-navy-400 text-center py-2">Sin gastos en el período</p>
              : pnl.gastosPorCategoria.map((g, i) => {
                const pct = pnl.gastos > 0 ? (Number(g.total) / pnl.gastos) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-navy-600 font-medium">{g.categoria}</span>
                      <span className="text-rose-600 font-semibold">{formatCurrency(Number(g.total))}</span>
                    </div>
                    <div className="w-full bg-navy-100 rounded-full h-1.5">
                      <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-navy-400 mt-0.5">{pct.toFixed(1)}%</p>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}


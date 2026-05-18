'use client';

import { useState } from 'react';
import {
  useVentasPorDia, useTopProductos, useResumenDia,
} from '@/hooks/useReportes';
import { reportesService } from '@/services/reportes.service';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3, TrendingUp, ShoppingBag, Calendar, ArrowUpRight, Download, FileDown,
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import {
  downloadCSV, BarChartSimple, StatCard, LoadingCard, QueryError,
} from '@/components/reportes/reportes-shared';
import { PeriodCompareBanner } from '@/components/reportes/PeriodCompareBanner';

// ── Tab: Ventas ───────────────────────────────────────────────────────────────

export function TabVentas({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const hoy = new Date().toISOString().split('T')[0];
  const { data: ventasDia = [], isLoading: lv, isError: ev, error: errV, refetch: rv } = useVentasPorDia(desde, hasta, tiendaId);
  const { data: topProductos = [], isLoading: lt, isError: et, error: errT, refetch: rt } = useTopProductos(desde, hasta, 10, tiendaId);
  const { data: resumenHoy } = useResumenDia(hoy, tiendaId);

  if (ev) return <QueryError message={errV instanceof Error ? errV.message : 'Error al cargar ventas'} onRetry={() => rv()} />;
  if (et) return <QueryError message={errT instanceof Error ? errT.message : 'Error al cargar productos'} onRetry={() => rt()} />;

  const totalMonto         = ventasDia.reduce((s, d) => s + Number(d.totalMonto), 0);
  const totalTransacciones = ventasDia.reduce((s, d) => s + Number(d.totalVentas), 0);
  const ticketPromedio     = totalTransacciones > 0 ? totalMonto / totalTransacciones : 0;

  const exportarVentas = () => {
    downloadCSV(`ventas_${desde}_${hasta}.csv`,
      ['Fecha', 'Transacciones', 'Total ventas', 'Ticket promedio'],
      [...ventasDia].reverse().map((d) => {
        const tv = Number(d.totalVentas), tm = Number(d.totalMonto);
        return [d.dia, tv, tm, tv > 0 ? (tm / tv).toFixed(2) : '0.00'];
      })
    );
  };

  const exportarProductos = () => {
    downloadCSV(`top_productos_${desde}_${hasta}.csv`,
      ['Producto', 'Unidades vendidas', 'Total ventas'],
      topProductos.map((p) => [p.nombre, Number(p.unidadesVendidas), Number(p.totalVentas)])
    );
  };

  const referencia = hasta || hoy;

  const exportarPdf = async () => {
    setPdfLoading(true);
    try {
      await reportesService.ventasResumenPdf(desde, hasta, tiendaId);
    } catch {
      toast.error('No se pudo generar el PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PeriodCompareBanner referencia={referencia} tiendaId={tiendaId} mode="ventas" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Ventas totales" value={formatCurrency(totalMonto)}
          icon={<TrendingUp size={18} className="text-primary-600" />} color="bg-primary-100" />
        <StatCard label="Transacciones" value={String(totalTransacciones)}
          sub={`en ${ventasDia.length} día(s)`}
          icon={<ArrowUpRight size={18} className="text-emerald-600" />} color="bg-emerald-100" />
        <StatCard label="Ticket promedio" value={formatCurrency(ticketPromedio)}
          icon={<ShoppingBag size={18} className="text-primary-600" />} color="bg-primary-100" />
        <StatCard label="Gastos hoy" value={formatCurrency(Number(resumenHoy?.totalGastos ?? 0))}
          icon={<Calendar size={18} className="text-rose-500" />} color="bg-rose-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-[12px] shadow-card">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-100/40">
            <BarChart3 size={16} className="text-primary-500" />
            <span className="font-semibold text-navy-800">Ventas por día</span>
          </div>
          <div className="p-5">
            {lv ? <LoadingCard /> : <BarChartSimple data={ventasDia.map((d) => ({ label: d.dia, value: Number(d.totalMonto) }))} />}
          </div>
        </div>

        <div className="bg-white rounded-[12px] shadow-card">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-100/40">
            <ShoppingBag size={16} className="text-primary-500" />
            <span className="font-semibold text-navy-800">Top productos</span>
            {topProductos.length > 0 && (
              <button onClick={exportarProductos}
                className="ml-auto flex items-center gap-1.5 text-xs text-navy-500 hover:text-primary-600 font-medium transition-colors border border-navy-200 hover:border-primary-400 px-3 py-1.5 rounded-lg">
                <Download size={12} /> CSV
              </button>
            )}
          </div>
          <div className="p-4">
            {lt ? <LoadingCard /> : topProductos.length === 0
              ? <p className="text-center text-navy-400 text-sm py-8">Sin datos</p>
              : (
                <div className="space-y-2.5">
                  {topProductos.slice(0, 8).map((p, i) => {
                    const maxVal = Number(topProductos[0]?.totalVentas ?? 1);
                    const pct = (Number(p.totalVentas) / maxVal) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-navy-400 w-4 shrink-0">#{i + 1}</span>
                            <span className="text-xs font-medium text-navy-700 truncate">{p.nombre}</span>
                          </div>
                          <span className="text-xs font-semibold text-navy-800 shrink-0 ml-2">
                            {formatCurrency(Number(p.totalVentas))}
                          </span>
                        </div>
                        <div className="w-full bg-navy-100 rounded-full h-1.5">
                          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-navy-400 mt-0.5">{Number(p.unidadesVendidas).toLocaleString()} uds.</p>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>
      </div>

      {ventasDia.length > 0 && (
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-100/40 flex items-center justify-between">
            <span className="font-semibold text-navy-800 text-sm">Detalle por día</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={exportarPdf} disabled={pdfLoading || ventasDia.length === 0}
                className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-primary-600 font-medium transition-colors border border-navy-200 hover:border-primary-400 px-3 py-1.5 rounded-lg disabled:opacity-50">
                <FileDown size={12} /> {pdfLoading ? 'PDF…' : 'PDF'}
              </button>
              <button type="button" onClick={exportarVentas}
                className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-primary-600 font-medium transition-colors border border-navy-200 hover:border-primary-400 px-3 py-1.5 rounded-lg">
                <Download size={12} /> CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header">Fecha</th>
                <th className="table-header text-center">Transacciones</th>
                <th className="table-header text-right">Total ventas</th>
                <th className="table-header text-right">Ticket prom.</th>
              </tr></thead>
              <tbody>
                {[...ventasDia].reverse().map((d, i) => {
                  const tv = Number(d.totalVentas), tm = Number(d.totalMonto);
                  return (
                    <tr key={i} className="table-row-hover">
                      <td className="table-cell text-navy-700 font-medium">{d.dia}</td>
                      <td className="table-cell text-center">{tv}</td>
                      <td className="table-cell text-right font-semibold text-navy-800">{formatCurrency(tm)}</td>
                      <td className="table-cell text-right text-navy-500">{formatCurrency(tv > 0 ? tm / tv : 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-navy-50/60 font-semibold">
                  <td className="table-cell text-navy-700">Total período</td>
                  <td className="table-cell text-center text-navy-700">{totalTransacciones}</td>
                  <td className="table-cell text-right text-primary-600">{formatCurrency(totalMonto)}</td>
                  <td className="table-cell text-right text-navy-500">{formatCurrency(ticketPromedio)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



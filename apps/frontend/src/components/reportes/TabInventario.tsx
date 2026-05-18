'use client';

import { useState, useEffect } from 'react';
import { useInventarioValorizado } from '@/hooks/useReportes';
import { reportesService } from '@/services/reportes.service';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp, ShoppingBag, DollarSign, Package, Download, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  downloadCSV, BarChartSimple, StatCard, LoadingCard, QueryError,
} from '@/components/reportes/reportes-shared';

// ── Tab: Inventario ───────────────────────────────────────────────────────────

const INVENTARIO_PAGE_SIZE = 25;

export function TabInventario() {
  const [page, setPage] = useState(1);
  const [buscar, setBuscar] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(buscar); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [buscar]);

  const { data: inv, isLoading, isFetching } = useInventarioValorizado(page, INVENTARIO_PAGE_SIZE, debouncedQ);

  if (isLoading && !inv) return <LoadingCard />;
  if (!inv) return <p className="text-center text-navy-400 text-sm py-8">Sin datos</p>;

  const { items, total } = inv.articulos;
  const totalPages = Math.max(1, Math.ceil(total / INVENTARIO_PAGE_SIZE));

  const exportarInventario = async () => {
    setExporting(true);
    try {
      const rows = await reportesService.inventarioValorizadoExport(debouncedQ);
      downloadCSV(`inventario_valorizado_${new Date().toISOString().split('T')[0]}.csv`,
        ['Artículo', 'Categoría', 'Stock', 'Costo unit.', 'Valor costo', 'Valor venta'],
        rows.map((a) => [
          a.nombre, a.categoria ?? '', a.cantidad ?? 0,
          Number(a.costo).toFixed(2), Number(a.valorCosto).toFixed(2), Number(a.valorVenta).toFixed(2),
        ]),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-navy-500 bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
        Totales y categorías incluyen todo el inventario activo. La tabla muestra {INVENTARIO_PAGE_SIZE} artículos por página; el CSV exporta hasta 15 000 filas.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Valor a costo" value={formatCurrency(inv.totales.totalCosto)}
          icon={<Package size={18} className="text-navy-600" />} color="bg-navy-100" />
        <StatCard label="Valor a precio venta" value={formatCurrency(inv.totales.totalVenta)}
          icon={<TrendingUp size={18} className="text-primary-600" />} color="bg-primary-100" />
        <StatCard label="Ganancia latente" value={formatCurrency(inv.totales.gananciaLatente)}
          icon={<DollarSign size={18} className="text-emerald-600" />} color="bg-emerald-100"
          highlight={false} />
        <StatCard label="Artículos activos" value={String(inv.totales.totalArticulos)}
          sub={`${inv.totales.totalUnidades.toLocaleString()} unidades`}
          icon={<ShoppingBag size={18} className="text-primary-600" />} color="bg-primary-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Por categoría */}
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-100/40">
            <p className="font-semibold text-navy-800 text-sm">Por categoría</p>
          </div>
          <div className="p-4 space-y-2.5">
            {inv.porCategoria.map((c, i) => {
              const pct = inv.totales.totalCosto > 0 ? (Number(c.valorCosto) / inv.totales.totalCosto) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-navy-700 font-medium">{c.categoria ?? 'Sin categoría'}</span>
                    <span className="text-navy-700 font-semibold">{formatCurrency(Number(c.valorCosto))}</span>
                  </div>
                  <div className="w-full bg-navy-100 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-navy-400 mt-0.5">{c.articulos} artículos · {pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla artículos */}
        <div className="lg:col-span-2 bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-navy-100/40 flex items-center gap-3">
            <p className="font-semibold text-navy-800 text-sm">Artículos valorizados</p>
            <input className="input-field text-sm py-1.5 ml-auto w-48" value={buscar}
              onChange={(e) => setBuscar(e.target.value)} placeholder="Filtrar..." />
            <button onClick={exportarInventario} disabled={exporting}
              className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-primary-600 font-medium transition-colors border border-navy-200 hover:border-primary-400 px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-50">
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              CSV
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto relative">
            {isFetching && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
                <Loader2 className="animate-spin text-primary-500" size={20} />
              </div>
            )}
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="table-header">Artículo</th>
                  <th className="table-header text-center">Stock</th>
                  <th className="table-header text-right">Costo unit.</th>
                  <th className="table-header text-right">Valor costo</th>
                  <th className="table-header text-right">Valor venta</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-cell text-center text-navy-400 text-sm py-6">
                      Sin artículos que coincidan.
                    </td>
                  </tr>
                ) : items.map((a, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="table-cell">
                      <p className="font-medium text-navy-700 text-sm">{a.nombre}</p>
                      <p className="text-xs text-navy-400">{a.categoria ?? '—'}</p>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`text-sm font-semibold ${
                        (a.cantidad ?? 0) === 0 ? 'text-rose-500' :
                        (a.cantidad ?? 0) <= 5  ? 'text-amber-500' : 'text-navy-700'
                      }`}>{a.cantidad ?? 0}</span>
                    </td>
                    <td className="table-cell text-right text-navy-500 text-sm">{formatCurrency(Number(a.costo))}</td>
                    <td className="table-cell text-right font-semibold text-navy-700 text-sm">{formatCurrency(Number(a.valorCosto))}</td>
                    <td className="table-cell text-right text-primary-600 text-sm font-semibold">{formatCurrency(Number(a.valorVenta))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-navy-100/40 flex items-center justify-between text-xs text-navy-500">
            <span>{total.toLocaleString()} artículo(s) · página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-navy-200 disabled:opacity-40 hover:border-primary-400">
                <ChevronLeft size={14} />
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-navy-200 disabled:opacity-40 hover:border-primary-400">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


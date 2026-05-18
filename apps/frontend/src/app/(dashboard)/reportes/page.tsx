'use client';

import { useState, useEffect } from 'react';
import {
  useVentasPorDia, useTopProductos, useResumenDia,
  useGanancias, useInventarioValorizado, useTopClientes,
  useResumenPorSucursal, useVentasPorUsuario, useVentasPorCaja,
  useDgii607Preview, useDgii606Preview,
} from '@/hooks/useReportes';
import { useTiendas } from '@/hooks/useTiendas';
import { PageHeader }    from '@/components/layout/PageHeader';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { reportesPageTitle, reportesTabs, uiLabels } from '@/lib/ui-labels';
import {
  BarChart3, TrendingUp, ShoppingBag, Calendar, ArrowUpRight,
  Loader2, DollarSign, Package, Users, Download, FileText, Store,
  ClipboardList, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { reportesService } from '@/services/reportes.service';
import { useAuthStore } from '@/store/auth.store';

// ── Utilidad CSV ──────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(','),
    ...rows.map((r) => r.map(esc).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDefaultDates() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  return {
    desde: desde.toISOString().split('T')[0],
    hasta: hasta.toISOString().split('T')[0],
  };
}

function BarChartSimple({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <p className="text-center text-navy-400 text-sm py-8">Sin datos</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-40 w-full">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative"
            title={`${d.label}: ${formatCurrency(d.value)}`}>
            <div className="w-full bg-primary-500 rounded-t-sm transition-all group-hover:bg-primary-600"
              style={{ height: `${Math.max(pct, 2)}%` }} />
            <span className="text-[9px] text-navy-400 rotate-45 origin-left truncate w-6">
              {d.label.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color, highlight }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border shadow-card p-4 flex items-center gap-4 ${
      highlight ? 'bg-primary-600 border-primary-600' : 'bg-white border-navy-100'
    }`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs font-medium ${highlight ? 'text-primary-200' : 'text-navy-400'}`}>{label}</p>
        <p className={`text-xl font-bold ${highlight ? 'text-white' : 'text-navy-800'}`}>{value}</p>
        {sub && <p className={`text-xs ${highlight ? 'text-primary-200' : 'text-navy-400'}`}>{sub}</p>}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="animate-spin text-primary-400" size={24} />
    </div>
  );
}

// ── Filtro de fechas compartido ───────────────────────────────────────────────

function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-rose-700">{message}</p>
      <button type="button" onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900">
        <RefreshCw size={13} /> Reintentar
      </button>
    </div>
  );
}

function DateFilter({ desde, hasta, setDesde, setHasta, tiendaId, setTiendaId, tiendas, isAdmin, userTiendaId }: {
  desde: string; hasta: string;
  setDesde: (v: string) => void; setHasta: (v: string) => void;
  tiendaId: number | '';
  setTiendaId: (v: number | '') => void;
  tiendas: { id: number; nombre: string }[];
  isAdmin: boolean;
  userTiendaId?: number | null;
}) {
  const PRESETS = [
    { label: 'Hoy',       d: 0  },
    { label: 'Últ. 7',   d: 6  },
    { label: 'Últ. 30',  d: 29 },
    { label: 'Este mes',  d: -1 },
  ];

  const apply = (d: number) => {
    const h = new Date();
    if (d === -1) {
      const de = new Date(h.getFullYear(), h.getMonth(), 1);
      setDesde(de.toISOString().split('T')[0]);
    } else {
      const de = new Date(); de.setDate(de.getDate() - d);
      setDesde(de.toISOString().split('T')[0]);
    }
    setHasta(h.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white rounded-[12px] shadow-card p-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs font-medium text-navy-600 block mb-1">Desde</label>
        <input type="date" value={desde} max={hasta}
          onChange={(e) => setDesde(e.target.value)} className="input-field w-40" />
      </div>
      <div>
        <label className="text-xs font-medium text-navy-600 block mb-1">Hasta</label>
        <input type="date" value={hasta} min={desde}
          onChange={(e) => setHasta(e.target.value)} className="input-field w-40" />
      </div>
      <div>
        <label className="text-xs font-medium text-navy-600 block mb-1">Sucursal</label>
        {!isAdmin && userTiendaId ? (
          <p className="input-field w-48 bg-navy-50 text-navy-700 cursor-default text-sm">
            {tiendas.find((t) => t.id === userTiendaId)?.nombre ?? `Sucursal #${userTiendaId}`}
          </p>
        ) : (
          <Select
            wrapperClassName="w-48"
            value={tiendaId === '' ? '' : String(tiendaId)}
            onChange={(e) => setTiendaId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Todas las sucursales</option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </Select>
        )}
      </div>
      <div className="flex gap-2 ml-auto flex-wrap">
        {PRESETS.map(({ label, d }) => (
          <button key={label} onClick={() => apply(d)}
            className="text-xs px-3 py-1.5 rounded-lg border border-navy-200 text-navy-600 hover:border-primary-400 hover:text-primary-600 font-medium transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Ventas ───────────────────────────────────────────────────────────────

function TabVentas({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
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

  return (
    <div className="space-y-5">
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
            <button onClick={exportarVentas}
              className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-primary-600 font-medium transition-colors border border-navy-200 hover:border-primary-400 px-3 py-1.5 rounded-lg">
              <Download size={12} /> Exportar CSV
            </button>
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

function TabPnL({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
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

// ── Tab: Inventario ───────────────────────────────────────────────────────────

const INVENTARIO_PAGE_SIZE = 25;

function TabInventario() {
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

// ── Tab: Clientes ─────────────────────────────────────────────────────────────

function TabClientes({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
  const { data: clientes = [], isLoading, isError, error, refetch } = useTopClientes(desde, hasta, 20, tiendaId);

  if (isLoading) return <LoadingCard />;
  if (isError) return <QueryError message={error instanceof Error ? error.message : 'Error al cargar clientes'} onRetry={() => refetch()} />;

  const totalComprasSum = clientes.reduce((s, c) => s + Number(c.totalCompras), 0);

  const exportarClientes = () => {
    downloadCSV(`clientes_${desde}_${hasta}.csv`,
      ['#', 'Cliente', 'Empresa', 'Transacciones', 'Total compras', 'Saldo pendiente'],
      clientes.map((c, i) => [
        i + 1, c.nombre, c.compania ?? '',
        c.totalTransacciones, Number(c.totalCompras).toFixed(2), Number(c.saldo).toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Clientes activos" value={String(clientes.length)}
          sub="con compras en el período"
          icon={<Users size={18} className="text-primary-600" />} color="bg-primary-100" />
        <StatCard label="Total compras" value={formatCurrency(totalComprasSum)}
          icon={<TrendingUp size={18} className="text-emerald-600" />} color="bg-emerald-100" />
        <StatCard label="Promedio por cliente" value={formatCurrency(clientes.length > 0 ? totalComprasSum / clientes.length : 0)}
          icon={<DollarSign size={18} className="text-primary-600" />} color="bg-primary-100" />
      </div>

      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-navy-100/40 flex items-center gap-2">
          <Users size={15} className="text-primary-500" />
          <span className="font-semibold text-navy-800 text-sm">Top clientes por compras</span>
          {clientes.length > 0 && (
            <button onClick={exportarClientes}
              className="ml-auto flex items-center gap-1.5 text-xs text-navy-500 hover:text-primary-600 font-medium transition-colors border border-navy-200 hover:border-primary-400 px-3 py-1.5 rounded-lg">
              <Download size={12} /> Exportar CSV
            </button>
          )}
        </div>
        {clientes.length === 0 ? (
          <p className="text-center text-navy-400 text-sm py-10">Sin ventas a clientes identificados en el período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-header">#</th>
                <th className="table-header">Cliente</th>
                <th className="table-header text-center hidden md:table-cell">Transacciones</th>
                <th className="table-header text-right">Total compras</th>
                <th className="table-header text-right">% del total</th>
                <th className="table-header text-right">Saldo pendiente</th>
              </tr></thead>
              <tbody>
                {clientes.map((c, i) => {
                  const pct = totalComprasSum > 0 ? (Number(c.totalCompras) / totalComprasSum) * 100 : 0;
                  return (
                    <tr key={c.id} className="table-row-hover">
                      <td className="table-cell text-navy-400 font-bold text-sm">#{i + 1}</td>
                      <td className="table-cell">
                        <p className="font-medium text-navy-800">{c.nombre}</p>
                        {c.compania && <p className="text-xs text-navy-400">{c.compania}</p>}
                      </td>
                      <td className="table-cell text-center hidden md:table-cell text-navy-500 text-sm">
                        {c.totalTransacciones}
                      </td>
                      <td className="table-cell text-right font-bold text-navy-700">
                        {formatCurrency(Number(c.totalCompras))}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-navy-100 rounded-full h-1.5 hidden sm:block">
                            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-navy-500">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        {Number(c.saldo) > 0
                          ? <span className="text-sm font-bold text-amber-600">{formatCurrency(Number(c.saldo))}</span>
                          : <span className="text-sm text-navy-400">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: DGII ─────────────────────────────────────────────────────────────────

function DgiiPreviewAlerts({ alertas }: { alertas: string[] }) {
  if (!alertas.length) {
    return <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Sin alertas para este período.</p>;
  }
  return (
    <ul className="text-xs text-amber-900 bg-amber-50 px-3 py-2 rounded-lg space-y-1 list-none">
      {alertas.map((a, i) => (
        <li key={i} className="flex gap-1.5 items-start">
          <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
          <span>{a}</span>
        </li>
      ))}
    </ul>
  );
}

function TabDGII() {
  const now = new Date();
  const defaultPeriodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [periodo, setPeriodo] = useState(defaultPeriodo);
  const [loading607, setLoading607] = useState(false);
  const [loading606, setLoading606] = useState(false);
  const [error607, setError607] = useState('');
  const [error606, setError606] = useState('');
  const { data: preview607, isLoading: loadingPreview607 } = useDgii607Preview(periodo);
  const { data: preview606, isLoading: loadingPreview606 } = useDgii606Preview(periodo);

  const handleDescargar607 = async () => {
    setLoading607(true); setError607('');
    try { await reportesService.dgii607(periodo); }
    catch { setError607('Error al generar el archivo 607'); }
    finally { setLoading607(false); }
  };

  const handleDescargar606 = async () => {
    setLoading606(true); setError606('');
    try { await reportesService.dgii606(periodo); }
    catch { setError606('Error al generar el archivo 606'); }
    finally { setLoading606(false); }
  };

  const periodoLabel = (() => {
    if (!/^\d{6}$/.test(periodo)) return '';
    const y = parseInt(periodo.substring(0, 4));
    const m = parseInt(periodo.substring(4, 6)) - 1;
    return new Date(y, m, 1).toLocaleString('es-DO', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="space-y-5">
      {/* Selector de período */}
      <div className="bg-white rounded-[12px] shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-primary-500" />
          <h3 className="font-semibold text-navy-800">Formularios DGII</h3>
          <span className="text-xs text-navy-400 ml-1">República Dominicana</span>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-xs font-medium text-navy-600 block mb-1">Período (YYYYMM)</label>
            <input
              type="month"
              value={`${periodo.substring(0, 4)}-${periodo.substring(4, 6)}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-');
                if (y && m) setPeriodo(`${y}${m}`);
              }}
              className="input-field w-44"
            />
          </div>
          {periodoLabel && (
            <p className="text-sm text-navy-500 mb-2 capitalize">{periodoLabel}</p>
          )}
        </div>
      </div>

      {/* Tarjetas de descarga */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 607 Ventas */}
        <div className="bg-white rounded-[12px] shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-emerald-600" />
            </div>
            <div>
              <h4 className="font-bold text-navy-800">Formato 607</h4>
              <p className="text-sm text-navy-500">Registro de Ventas de Bienes y Servicios</p>
              <p className="text-xs text-navy-400 mt-1">
                Incluye todas las ventas del período con NCF, ITBIS y método de pago.
              </p>
            </div>
          </div>
          {loadingPreview607 ? (
            <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-navy-400" /></div>
          ) : preview607 && (
            <div className="text-xs space-y-2 border border-navy-100 rounded-lg p-3 bg-navy-50/60">
              <p className="text-navy-700">
                <span className="font-semibold">{preview607.lineas}</span> líneas ·{' '}
                {formatCurrency(preview607.totalVentas)}
              </p>
              <p className="text-navy-500">ITBIS estimado (18% incluido): {formatCurrency(preview607.itbisEstimado)}</p>
              {(preview607.sinNcf > 0 || preview607.clienteSinIdentificacion > 0) && (
                <p className="text-rose-600">
                  {preview607.sinNcf > 0 && `${preview607.sinNcf} sin NCF`}
                  {preview607.sinNcf > 0 && preview607.clienteSinIdentificacion > 0 && ' · '}
                  {preview607.clienteSinIdentificacion > 0 && `${preview607.clienteSinIdentificacion} cliente sin ID`}
                </p>
              )}
              <DgiiPreviewAlerts alertas={preview607.alertas} />
            </div>
          )}
          {error607 && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error607}</p>}
          <button
            onClick={handleDescargar607}
            disabled={loading607 || !/^\d{6}$/.test(periodo)}
            className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading607
              ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
              : <><Download size={14} /> Descargar 607-{periodo}.txt</>
            }
          </button>
        </div>

        {/* 606 Compras */}
        <div className="bg-white rounded-[12px] shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-navy-800">Formato 606</h4>
              <p className="text-sm text-navy-500">Registro de Compras de Bienes y Servicios</p>
              <p className="text-xs text-navy-400 mt-1">
                Incluye órdenes de compra recibidas y gastos del período con ITBIS calculado.
              </p>
            </div>
          </div>
          {loadingPreview606 ? (
            <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-navy-400" /></div>
          ) : preview606 && (
            <div className="text-xs space-y-2 border border-navy-100 rounded-lg p-3 bg-navy-50/60">
              <p className="text-navy-700">
                <span className="font-semibold">{preview606.lineas}</span> líneas
                ({preview606.lineasOrdenes} compras + {preview606.lineasGastos} gastos) ·{' '}
                {formatCurrency(preview606.totalCompras)}
              </p>
              <p className="text-navy-500">ITBIS estimado: {formatCurrency(preview606.itbisEstimado)}</p>
              {preview606.ordenSinRncProveedor > 0 && (
                <p className="text-rose-600">{preview606.ordenSinRncProveedor} orden(es) sin RNC de proveedor</p>
              )}
              <DgiiPreviewAlerts alertas={preview606.alertas} />
            </div>
          )}
          {error606 && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error606}</p>}
          <button
            onClick={handleDescargar606}
            disabled={loading606 || !/^\d{6}$/.test(periodo)}
            className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading606
              ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
              : <><Download size={14} /> Descargar 606-{periodo}.txt</>
            }
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-navy-50 rounded-[12px] p-4 text-xs text-navy-500 space-y-1">
        <p className="font-semibold text-navy-700">Notas</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Los archivos se generan en formato de texto plano separado por pipes (|), listo para cargar en DGII.</li>
          <li>El ITBIS se calcula como el 18% incluido en el precio: base = total ÷ 1.18, ITBIS = total − base.</li>
          <li>Ventas anuladas quedan excluidas del 607.</li>
          <li>El RNC de la empresa se toma de la configuración del sistema.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Tab: Auditoría ────────────────────────────────────────────────────────────

function TabAuditoria({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
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

// ── Tab: Por sucursal ─────────────────────────────────────────────────────────

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', CREDITO: 'Crédito',
};

function TabPorSucursal({ desde, hasta }: { desde: string; hasta: string }) {
  const { data: tiendas = [] } = useTiendas();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';
  const [tiendaId, setTiendaId] = useState<number | ''>('');

  useEffect(() => {
    if (!isAdmin && user?.tiendaId) setTiendaId(user.tiendaId);
  }, [isAdmin, user?.tiendaId]);

  const { data, isLoading, isError, error } = useResumenPorSucursal(
    tiendaId === '' ? null : Number(tiendaId),
    desde,
    hasta
  );

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

// ── Página principal ──────────────────────────────────────────────────────────

type Tab = 'ventas' | 'pnl' | 'inventario' | 'clientes' | 'auditoria' | 'sucursal' | 'dgii';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'ventas',     label: reportesTabs.ventas,      icon: <BarChart3  size={15} /> },
  { id: 'pnl',        label: reportesTabs.pnl,         icon: <DollarSign size={15} /> },
  { id: 'inventario', label: reportesTabs.inventario,  icon: <Package    size={15} /> },
  { id: 'clientes',   label: reportesTabs.clientes,    icon: <Users      size={15} /> },
  { id: 'auditoria',  label: reportesTabs.auditoria,   icon: <ClipboardList size={15} /> },
  { id: 'sucursal',   label: reportesTabs.sucursal,    icon: <Store      size={15} /> },
  { id: 'dgii',       label: reportesTabs.dgii,        icon: <FileText   size={15} /> },
];

export default function ReportesPage() {
  const defaults = getDefaultDates();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';
  const { data: tiendas = [] } = useTiendas();
  const [tab,   setTab]   = useState<Tab>('ventas');
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [tiendaFiltro, setTiendaFiltro] = useState<number | ''>('');

  useEffect(() => {
    if (!isAdmin && user?.tiendaId) setTiendaFiltro(user.tiendaId);
  }, [isAdmin, user?.tiendaId]);

  const tiendaIdParam = tiendaFiltro === '' ? null : Number(tiendaFiltro);

  return (
    <main className="space-y-5" aria-labelledby="reportes-heading">
      <h1 id="reportes-heading" className="sr-only">
        {reportesPageTitle()}
      </h1>
      <PageHeader
        title={reportesPageTitle()}
        breadcrumb={[uiLabels.breadcrumbRoot, uiLabels.reportes]}
      />

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap bg-white rounded-[12px] shadow-card p-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-navy-600 hover:bg-navy-100'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Filtro de fechas (no aplica para inventario ni DGII) */}
      {tab !== 'inventario' && tab !== 'dgii' && (
        <DateFilter
          desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta}
          tiendaId={tiendaFiltro} setTiendaId={setTiendaFiltro}
          tiendas={tiendas} isAdmin={isAdmin} userTiendaId={user?.tiendaId}
        />
      )}

      {/* Contenido del tab activo */}
      {tab === 'ventas'     && <TabVentas     desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'pnl'        && <TabPnL        desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'inventario' && <TabInventario />}
      {tab === 'clientes'   && <TabClientes   desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'auditoria'  && <TabAuditoria  desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'sucursal'   && <TabPorSucursal desde={desde} hasta={hasta} />}
      {tab === 'dgii'       && <TabDGII />}
    </main>
  );
}

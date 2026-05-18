'use client';

import { useTopClientes } from '@/hooks/useReportes';
import { formatCurrency } from '@/lib/utils';
import { Users, TrendingUp, DollarSign, Download } from 'lucide-react';
import {
  downloadCSV, BarChartSimple, StatCard, LoadingCard, QueryError,
} from '@/components/reportes/reportes-shared';

// ── Tab: Clientes ─────────────────────────────────────────────────────────────

export function TabClientes({ desde, hasta, tiendaId }: { desde: string; hasta: string; tiendaId?: number | null }) {
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


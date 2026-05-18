'use client';

import { useOperacionesComerciales } from '@/hooks/useReportes';
import { formatCurrency } from '@/lib/utils';
import { Tag, ScrollText, ClipboardList, TrendingUp } from 'lucide-react';
import { LoadingCard, QueryError, StatCard } from '@/components/reportes/reportes-shared';

export function TabOperaciones({ desde, hasta }: { desde: string; hasta: string }) {
  const { data, isLoading, isError, error, refetch } = useOperacionesComerciales(desde, hasta);

  if (isError) {
    return (
      <QueryError
        message={error instanceof Error ? error.message : 'Error al cargar operaciones'}
        onRetry={() => refetch()}
      />
    );
  }

  if (isLoading || !data) return <LoadingCard />;

  const conv = data.cotizaciones.conversion;

  return (
    <div className="space-y-5">
      <p className="text-xs text-navy-500">
        Promociones, cotizaciones y compras vs ventas · zona horaria: {data.timezone}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Ventas (período)"
          value={formatCurrency(data.ventas.monto)}
          sub={`${data.ventas.transacciones} transacciones`}
          icon={<TrendingUp size={18} className="text-primary-600" />}
          color="bg-primary-100"
        />
        <StatCard
          label="Compras recibidas"
          value={formatCurrency(data.compras.monto)}
          sub={`${data.compras.ordenesRecibidas} órdenes`}
          icon={<ClipboardList size={18} className="text-emerald-600" />}
          color="bg-emerald-100"
        />
        <StatCard
          label="Compras / ventas"
          value={data.ratioComprasVentas != null ? `${data.ratioComprasVentas}%` : '—'}
          sub="Monto compras sobre ventas"
          icon={<ClipboardList size={18} className="text-amber-600" />}
          color="bg-amber-100"
        />
        <StatCard
          label="Conv. cotizaciones"
          value={conv.tasaCierre != null ? `${conv.tasaCierre}%` : '—'}
          sub={`${conv.aceptadas} aceptadas · ${conv.enviadas} enviadas`}
          icon={<ScrollText size={18} className="text-violet-600" />}
          color="bg-violet-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-[12px] shadow-card p-5">
          <h3 className="font-semibold text-navy-800 flex items-center gap-2 mb-3">
            <ScrollText size={16} className="text-primary-500" />
            Cotizaciones por estado
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-500 border-b border-navy-100">
                <th className="pb-2">Estado</th>
                <th className="pb-2 text-right">Cant.</th>
                <th className="pb-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.cotizaciones.porEstado.length === 0 ? (
                <tr><td colSpan={3} className="py-4 text-navy-400">Sin cotizaciones en el período</td></tr>
              ) : (
                data.cotizaciones.porEstado.map((r) => (
                  <tr key={r.estado} className="border-b border-navy-50">
                    <td className="py-2 capitalize">{r.estado.toLowerCase()}</td>
                    <td className="py-2 text-right">{Number(r.cantidad)}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(r.monto))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-[12px] shadow-card p-5">
          <h3 className="font-semibold text-navy-800 flex items-center gap-2 mb-3">
            <Tag size={16} className="text-primary-500" />
            Promociones
          </h3>
          <p className="text-sm text-navy-600 mb-3">
            {data.promociones.activas} activas · {data.promociones.usosTotales} usos acumulados
          </p>
          <ul className="space-y-2 text-sm">
            {data.promociones.top.length === 0 ? (
              <li className="text-navy-400">Sin promociones registradas</li>
            ) : (
              data.promociones.top.map((p) => (
                <li key={p.codigo} className="flex justify-between gap-2 border-b border-navy-50 pb-2">
                  <span className="font-medium text-navy-800">{p.nombre}</span>
                  <span className="text-navy-500">{Number(p.usosActuales)} usos</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

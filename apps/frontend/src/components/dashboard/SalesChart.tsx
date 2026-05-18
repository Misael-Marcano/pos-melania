'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useVentasPorDia } from '@/hooks/useReportes';
import { useDashboardCurrency } from '@/hooks/useDashboardCurrency';
import { QueryError } from '@/components/reportes/reportes-shared';

interface Props {
  tiendaId?: number | null;
}

export function SalesChart({ tiendaId = null }: Props) {
  const [view, setView] = useState<'mes' | 'semana'>('mes');
  const { symbol } = useDashboardCurrency();

  const range = useMemo(() => {
    const days  = view === 'mes' ? 30 : 7;
    return {
      desde: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      hasta: format(new Date(), 'yyyy-MM-dd'),
    };
  }, [view]);

  const { data: raw = [], isLoading, isError, error, refetch } = useVentasPorDia(
    range.desde,
    range.hasta,
    tiendaId,
  );

  const data = raw.map((d: { dia: string; totalMonto: number }) => ({
    dia:   format(new Date(d.dia + 'T12:00:00'), 'dd'),
    total: Number(d.totalMonto),
  }));

  const errorMsg = error instanceof Error ? error.message : 'No se pudo cargar el gráfico';

  return (
    <div className="bg-white rounded-[12px] shadow-card p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-navy-800 font-display text-lg tracking-tight">Ventas</h3>
          <p className="text-xs text-navy-400 mt-0.5">Resumen del período</p>
        </div>
        <div className="flex gap-1 bg-navy-50/80 p-1 rounded-xl">
          {(['mes', 'semana'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all duration-150 ${
                view === v
                  ? 'bg-white text-navy-800 shadow-ambient'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              {v === 'mes' ? 'Mes' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <QueryError message={errorMsg} onRetry={() => void refetch()} />
      ) : (
        <div className={isLoading ? 'opacity-50' : ''}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EBEA" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                cursor={{ fill: '#F5F3FF' }}
                contentStyle={{ border: 'none', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(val: number) => [`${symbol} ${val.toLocaleString('es-DO')}`, 'Ventas']}
                labelFormatter={(l) => `Día ${l}`}
              />
              <Bar dataKey="total" fill="#3D4E3D" radius={[5, 5, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

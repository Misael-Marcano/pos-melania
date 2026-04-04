'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '@/services/api.client';
import { useState } from 'react';
import { format, subDays } from 'date-fns';

export function SalesChart() {
  const [view, setView] = useState<'mes' | 'semana'>('mes');

  const { data = [] } = useQuery({
    queryKey: ['sales-chart', view],
    queryFn: async () => {
      const days  = view === 'mes' ? 30 : 7;
      const desde = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const hasta = format(new Date(), 'yyyy-MM-dd');
      const res   = await apiClient.get('/reportes/ventas-por-dia', { params: { desde, hasta } });
      return (res.data.data ?? []).map((d: { dia: string; totalMonto: number }) => ({
        dia:   format(new Date(d.dia), 'dd'),
        total: Number(d.totalMonto),
      }));
    },
  });

  return (
    <div className="bg-white rounded-[12px] shadow-card p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-navy-800 font-display">Ventas</h3>
          <p className="text-xs text-navy-400 mt-0.5">Resumen del período</p>
        </div>
        <div className="flex gap-1 bg-navy-50 p-1 rounded-lg">
          {(['mes', 'semana'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all duration-150 ${
                view === v
                  ? 'bg-white text-navy-800 shadow-sm'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              {v === 'mes' ? 'Mes' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ fill: '#F5F3FF' }}
            contentStyle={{ border: 'none', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
            formatter={(val: number) => [`RDS ${val.toLocaleString()}`, 'Ventas']}
            labelFormatter={(l) => `Día ${l}`}
          />
          <Bar dataKey="total" fill="#3D4E3D" radius={[5, 5, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import { RefreshCw, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
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

export function getDefaultDates() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 29);
  return {
    desde: desde.toISOString().split('T')[0],
    hasta: hasta.toISOString().split('T')[0],
  };
}

export function BarChartSimple({ data }: { data: { label: string; value: number }[] }) {
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

export function StatCard({ label, value, sub, icon, color, highlight }: {
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

export function LoadingCard() {
  return (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="animate-spin text-primary-400" size={24} />
    </div>
  );
}

export function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
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

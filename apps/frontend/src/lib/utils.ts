import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol = 'RDS') {
  return `${symbol}${amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Etiqueta corta (día del mes) para gráficos; acepta `YYYY-MM-DD` o ISO de SQL Server. */
export function formatChartDayLabel(dia: string | Date): string {
  const raw = typeof dia === 'string' ? dia.trim() : dia.toISOString();
  const ymd = raw.slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd)
    ? new Date(`${ymd}T12:00:00`)
    : new Date(raw);
  return isValid(d) ? format(d, 'dd') : '?';
}

export function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('es-DO', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

export function formatDateTime(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString('es-DO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol = 'RDS') {
  return `${symbol}${amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

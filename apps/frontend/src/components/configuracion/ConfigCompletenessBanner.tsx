'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ConfigCompletenessItem } from '@pos/shared';

export function ConfigCompletenessBanner({
  percent,
  items,
  onGoToTab,
}: {
  percent: number;
  items: ConfigCompletenessItem[];
  onGoToTab: (tab: ConfigCompletenessItem['tab']) => void;
}) {
  if (percent >= 100) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2 text-sm text-emerald-800">
        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
        <p>Configuración esencial completa. Revisa el checklist fiscal antes de producción.</p>
      </div>
    );
  }

  const pending = items.filter((i) => !i.ok);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <p>
          <strong>{percent}%</strong> de la configuración recomendada está lista.
          Completa los puntos pendientes para reportes DGII y operación diaria.
        </p>
      </div>
      <ul className="ml-6 space-y-1 text-xs">
        {pending.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="text-left underline hover:text-amber-950"
              onClick={() => onGoToTab(item.tab)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs mt-2 ml-6 text-navy-600">
        <Link href="/comprobante" className="text-primary-700 font-medium hover:underline">
          Configurar series NCF
        </Link>
        {' · '}
        <Link href="/reportes" className="text-primary-700 font-medium hover:underline">
          Reportes DGII
        </Link>
      </p>
    </div>
  );
}

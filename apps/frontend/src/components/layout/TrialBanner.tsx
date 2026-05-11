'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { useSaasContext } from '@/hooks/useSaasContext';
import { useAuthStore } from '@/store/auth.store';

const DISMISS_SESSION_KEY = 'pos:trial-banner-dismissed';

/**
 * Aviso de periodo de prueba activo o recién expirado (admin).
 * Datos desde `GET /saas/context` → `trial`.
 */
export function TrialBanner() {
  const user = useAuthStore((s) => s.user);
  const { data: saas } = useSaasContext();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_SESSION_KEY) === '1');
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
    setDismissed(true);
  };

  if (!user || user.rol !== 'admin') return null;
  if (!saas?.trial) return null;
  if (dismissed) return null;

  const { trial } = saas;

  if (trial.active && trial.daysRemaining != null) {
    const urgent = trial.daysRemaining <= 7;
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
          urgent
            ? 'bg-amber-500 text-amber-950'
            : 'bg-sky-600 text-white'
        }`}
      >
        <Clock size={16} className="shrink-0" />
        <p className="flex-1 min-w-0">
          <span className="font-semibold">Periodo de prueba</span>
          {' — '}
          {trial.daysRemaining === 1
            ? 'Queda 1 día.'
            : `Te quedan ${trial.daysRemaining} días.`}
          {' '}
          Configura tu plan cuando estés listo.
        </p>
        <Link
          href="/configuracion"
          className="inline-flex font-semibold underline underline-offset-2 hover:no-underline shrink-0"
        >
          Configuración
        </Link>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={handleDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (trial.expired) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-navy-800 text-white text-sm">
        <AlertTriangle size={16} className="shrink-0 text-amber-300" />
        <p className="flex-1 min-w-0">
          <span className="font-semibold">Periodo de prueba finalizado</span>
          {' — '}
          Elige un plan para continuar sin interrupciones.
        </p>
        <Link
          href="/configuracion"
          className="inline-flex font-semibold underline underline-offset-2 hover:no-underline shrink-0"
        >
          Ver planes
        </Link>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={handleDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}

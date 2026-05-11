'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, CreditCard, ArrowRight } from 'lucide-react';
import { useSaasContext } from '@/hooks/useSaasContext';
import { useAuthStore } from '@/store/auth.store';

const DISMISS_KEY = 'pos:onboarding-banner-dismissed';

/**
 * Banner de provisioning guiado. Se muestra cuando:
 * - El contexto SaaS indica `needsOnboarding = true`
 * - El usuario es `admin` (los cajeros no gestionan suscripciones)
 * - El usuario no ha descartado el banner en esta sesión
 */
export function OnboardingBanner() {
  const user = useAuthStore((s) => s.user);
  const { data: saas } = useSaasContext();
  const [dismissed, setDismissed] = useState(true); // empieza oculto hasta leer storage

  useEffect(() => {
    // Leer el flag de descarte del sessionStorage (persiste solo la sesión actual)
    const val = sessionStorage.getItem(DISMISS_KEY);
    setDismissed(val === '1');
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  // Solo para admin; plataforma y soporte no necesitan el aviso
  if (!user || user.rol !== 'admin') return null;
  if (!saas?.needsOnboarding) return null;
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-600 text-white text-sm">
      <CreditCard size={16} className="shrink-0" />
      <p className="flex-1 min-w-0">
        <span className="font-semibold">Activa tu suscripción</span>
        {' '}— Configura el plan de tu organización para habilitar todas las funciones.
      </p>
      <Link
        href="/configuracion"
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline shrink-0"
      >
        Ir a Configuración <ArrowRight size={14} />
      </Link>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-white/20 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

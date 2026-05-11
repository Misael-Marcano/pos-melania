'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { appBrand } from '@/lib/app-brand';
import { useBillingMutations, useBillingStatus } from '@/hooks/useBilling';
import { AlertTriangle, CreditCard, Clock, ArrowRight, Loader2, ExternalLink } from 'lucide-react';

type BlockCode = 'BILLING_SUSPENDED' | 'TRIAL_EXPIRED' | string;

function readUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pos_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { rol?: string };
    return u.rol ?? null;
  } catch {
    return null;
  }
}

export default function CuentaSuspendidaPage() {
  const router = useRouter();
  const [info, setInfo] = useState<{ code: BlockCode; message: string } | null>(null);
  const [canBilling, setCanBilling] = useState(false);
  const { data: billing, isLoading: billingLoading } = useBillingStatus();
  const { portal } = useBillingMutations();

  const showStripePortal =
    canBilling &&
    !billingLoading &&
    billing?.provider === 'stripe' &&
    !!billing?.tenant?.stripeCustomerId;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('pos_token')) {
      router.replace('/login');
      return;
    }
    const rol = readUserRole();
    setCanBilling(rol === 'admin' || rol === 'soporte' || rol === 'plataforma');
    try {
      const raw = sessionStorage.getItem('pos_access_block');
      if (raw) {
        const p = JSON.parse(raw) as { code?: BlockCode; message?: string };
        setInfo({
          code: p.code ?? 'BILLING_SUSPENDED',
          message: typeof p.message === 'string' ? p.message : '',
        });
      } else {
        setInfo({ code: 'BILLING_SUSPENDED', message: '' });
      }
    } catch {
      setInfo({ code: 'BILLING_SUSPENDED', message: '' });
    }
  }, [router]);

  const isTrial = info?.code === 'TRIAL_EXPIRED';

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAF9]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main
      aria-labelledby="cuenta-suspendida-heading"
      className="min-h-screen flex flex-col items-center justify-center bg-[#F7FAF9] p-6"
    >
      <div className="w-full max-w-md bg-white rounded-[14px] shadow-card border border-navy-100/50 p-8">
        <div className="flex justify-center mb-5">
          <span
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              isTrial ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isTrial ? <Clock size={28} strokeWidth={2} /> : <AlertTriangle size={28} strokeWidth={2} />}
          </span>
        </div>
        <h1
          id="cuenta-suspendida-heading"
          className="text-xl font-semibold text-navy-900 text-center mb-2"
        >
          {isTrial ? 'Periodo de prueba finalizado' : 'Cuenta suspendida'}
        </h1>
        <p className="text-sm text-navy-600 text-center leading-relaxed mb-6">
          {info.message ||
            (isTrial
              ? 'El tiempo de prueba de tu organización ha terminado. Contrata un plan para seguir usando el sistema.'
              : 'El acceso a la aplicación está suspendido por el estado de facturación. Regulariza el pago para continuar.')}
        </p>

        {canBilling ? (
          <div className="space-y-3">
            {showStripePortal && (
              <button
                type="button"
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  portal.mutate({ returnUrl: `${origin}/configuracion` });
                }}
                disabled={portal.isPending}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-70"
              >
                {portal.isPending ? (
                  <Loader2 className="animate-spin shrink-0" size={18} />
                ) : (
                  <ExternalLink size={18} className="shrink-0" />
                )}
                Abrir portal de facturación (Stripe)
              </button>
            )}
            <Link
              href="/configuracion"
              className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-medium text-sm transition-colors border ${
                showStripePortal
                  ? 'border-navy-200 text-navy-800 hover:bg-navy-50'
                  : 'bg-primary-600 text-white border-transparent hover:bg-primary-700'
              }`}
            >
              <CreditCard size={18} />
              Ir a Configuración — Plan
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-navy-500 text-center">
            Contacta al administrador de tu organización para actualizar el plan o el método de pago.
          </p>
        )}

        <p className="text-xs text-navy-400 text-center mt-8">{appBrand.shortName}</p>
      </div>
    </main>
  );
}

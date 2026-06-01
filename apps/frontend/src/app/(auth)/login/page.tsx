'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Loader2,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { appBrand, copyrightLine } from '@/lib/app-brand';
import { getLoginTenantSlug } from '@/lib/login-tenant-slug';
import { postLoginPath } from '@/lib/post-login-path';
import { uiLabels } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';
import { NexoIcon } from '@/components/layout/NexoIcon';
import { AppAtmosphere } from '@/components/layout/AppAtmosphere';
import { StaticSiteNotice } from '@/components/layout/StaticSiteNotice';
import { isStaticSite } from '@/lib/site-mode';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
type FormData = z.infer<typeof schema>;

const HIGHLIGHTS = [
  {
    key: 'v',
    icon: ShoppingCart,
    title: 'Ventas en caja',
    desc: 'Cobros, NCF y múltiples métodos de pago',
  },
  {
    key: 'i',
    icon: Package,
    title: 'Stock en vivo',
    desc: 'Inventario y alertas por sucursal',
  },
  {
    key: 'r',
    icon: BarChart3,
    title: uiLabels.reportes,
    desc: 'Métricas y exportación fiscal',
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await login(data.email, data.password, getLoginTenantSlug());
      const { user: u, platformTenantId } = useAuthStore.getState();
      router.replace(postLoginPath(u?.rol, platformTenantId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Credenciales inválidas');
    }
  };

  return (
    <main
      aria-labelledby="login-heading"
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[#E8EDEB]"
    >
      <h1 id="login-heading" className="sr-only">
        Iniciar sesión
      </h1>

      <AppAtmosphere />

      <div className="relative flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
        {/* Cabecera móvil / tablet */}
        <header className="mb-6 flex items-center justify-between lg:mb-8 lg:max-w-5xl lg:w-full lg:mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-navy-200/80 bg-white/70 px-3.5 py-2 text-xs font-medium text-navy-600 shadow-sm backdrop-blur-sm transition-colors hover:border-navy-300 hover:text-navy-900"
          >
            <ArrowLeft size={14} aria-hidden />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-900/20">
              <NexoIcon className="h-full w-full" ariaLabel="Nexo" />
            </div>
            <span className="font-display text-sm font-bold text-navy-800">
              {appBrand.shortName}
            </span>
          </div>
        </header>

        {/* Shell principal */}
        <div className="mx-auto flex w-full max-w-5xl flex-1 items-center">
          <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/60 shadow-float backdrop-blur-sm lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            {/* Panel marca */}
            <section
              aria-hidden
              className="relative order-1 hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-[#1a2618] p-10 text-white lg:flex"
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, transparent 40%, rgb(0 96 172 / 0.25) 100%)',
                }}
              />
              <div className="absolute -right-16 top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />

              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
                  <NexoIcon className="h-full w-full" ariaLabel="Nexo" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold leading-none">
                    {appBrand.shortName}
                  </p>
                  {appBrand.tagline.trim() ? (
                    <p className="mt-1 text-xs text-white/55">{appBrand.tagline}</p>
                  ) : null}
                </div>
              </div>

              <div className="relative my-10 space-y-8">
                <div>
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-100 ring-1 ring-white/15">
                    <Sparkles size={12} aria-hidden />
                    Plataforma POS
                  </p>
                  <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
                    Tu operación retail,
                    <br />
                    <span className="text-primary-100">centralizada</span>
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
                    Ventas, inventario y {uiLabels.reportes.toLowerCase()} en un solo lugar —
                    multi-sucursal y listo para facturación fiscal.
                  </p>
                </div>

                <ul className="space-y-4">
                  {HIGHLIGHTS.map(({ key, icon: Icon, title, desc }) => (
                    <li key={key} className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary-100 ring-1 ring-white/10">
                        <Icon size={18} aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-0.5 text-xs text-white/50">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Vista previa abstracta del panel */}
                <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-md">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-2 w-20 rounded-full bg-white/25" />
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-white/20" />
                      <div className="h-2 w-2 rounded-full bg-white/20" />
                      <div className="h-2 w-2 rounded-full bg-white/35" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[68, 42, 85].map((h, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-gradient-to-t from-secondary/40 to-white/20"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="h-8 flex-1 rounded-lg bg-white/10" />
                    <div className="h-8 w-24 rounded-lg bg-secondary/50" />
                  </div>
                </div>
              </div>

              <p className="relative text-[11px] text-white/35">{copyrightLine()}</p>
            </section>

            {/* Panel formulario */}
            <section className="order-2 flex flex-col justify-center bg-white p-8 sm:p-10 lg:p-12">
              <div className="mb-8 lg:mb-10">
                <div className="mb-4 hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md lg:flex">
                  <NexoIcon className="h-full w-full" ariaLabel="" />
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-navy-800 sm:text-[1.65rem]">
                  Bienvenido de vuelta
                </h2>
                <p className="mt-1.5 text-sm text-navy-400">
                  {isStaticSite
                    ? 'Instalación completa disponible en tu servidor o red local'
                    : 'Ingresa tus credenciales para continuar'}
                </p>
              </div>

              {isStaticSite ? (
                <StaticSiteNotice />
              ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-sm font-semibold text-navy-700"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400"
                      aria-hidden
                    />
                    <input
                      type="email"
                      id="login-email"
                      className={cn(
                        'input-field pl-10',
                        errors.email &&
                          'ring-2 ring-rose-500/25 focus:ring-rose-500/30',
                      )}
                      placeholder="usuario@ejemplo.com"
                      autoComplete="email"
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={
                        errors.email ? 'login-email-error' : undefined
                      }
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p
                      id="login-email-error"
                      className="mt-1.5 text-xs text-rose-600"
                      role="alert"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-1.5 block text-sm font-semibold text-navy-700"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400"
                      aria-hidden
                    />
                    <input
                      type="password"
                      id="login-password"
                      className={cn(
                        'input-field pl-10',
                        errors.password &&
                          'ring-2 ring-rose-500/25 focus:ring-rose-500/30',
                      )}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={
                        errors.password ? 'login-password-error' : undefined
                      }
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <p
                      id="login-password-error"
                      className="mt-1.5 text-xs text-rose-600"
                      role="alert"
                    >
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  >
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-rose-500"
                      aria-hidden
                    />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary mt-1 flex w-full items-center justify-center gap-2 py-3 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden />
                      Ingresando...
                    </>
                  ) : (
                    'Ingresar al sistema'
                  )}
                </button>
              </form>
              )}

              {!isStaticSite && (
              <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-navy-400">
                <ShieldCheck size={14} className="shrink-0 text-primary-500" aria-hidden />
                <span>Conexión segura · acceso por invitación</span>
              </div>
              )}

              <p className="mt-6 text-center text-xs text-navy-400">
                <Link
                  href="/terminos"
                  className="underline decoration-navy-300/80 underline-offset-2 hover:text-navy-700"
                >
                  Términos del servicio
                </Link>
                <span className="mx-2 text-navy-300">·</span>
                <Link
                  href="/privacidad"
                  className="underline decoration-navy-300/80 underline-offset-2 hover:text-navy-700"
                >
                  Privacidad
                </Link>
              </p>

              {/* Highlights compactos en móvil */}
              <ul className="mt-8 grid gap-3 border-t border-navy-100/80 pt-8 lg:hidden">
                {HIGHLIGHTS.map(({ key, icon: Icon, title }) => (
                  <li
                    key={key}
                    className="flex items-center gap-3 rounded-xl bg-navy-50/80 px-3.5 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                      <Icon size={15} aria-hidden />
                    </div>
                    <span className="text-sm font-medium text-navy-700">{title}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

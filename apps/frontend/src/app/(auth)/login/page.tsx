'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { appBrand, copyrightLine } from '@/lib/app-brand';
import { getLoginTenantSlug } from '@/lib/login-tenant-slug';
import { uiLabels } from '@/lib/ui-labels';
import { ShoppingCart, Package, BarChart2, ArrowLeft } from 'lucide-react';
import { NexoIcon } from '@/components/layout/NexoIcon';

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router  = useRouter();
  const login   = useAuthStore((s) => s.login);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await login(data.email, data.password, getLoginTenantSlug());
      const { user: u, platformTenantId } = useAuthStore.getState();
      if (u?.rol === 'plataforma' && platformTenantId == null) {
        router.replace('/select-organizacion');
      } else {
        router.replace('/panel');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Credenciales inválidas');
    }
  };

  return (
    <main aria-labelledby="login-heading" className="min-h-screen flex">
      <h1 id="login-heading" className="sr-only">
        Iniciar sesión
      </h1>
      {/* Panel izquierdo decorativo */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#273727] flex-col justify-between p-12 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3D4E3D]/60 via-transparent to-[#1a2618]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Logo + back link */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-900/50">
              <NexoIcon className="w-full h-full" ariaLabel="Nexo" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">{appBrand.shortName}</p>
              {appBrand.tagline.trim() ? (
                <p className="text-white/40 text-xs mt-0.5">{appBrand.tagline}</p>
              ) : null}
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-medium transition-colors"
          >
            <ArrowLeft size={13} /> Inicio
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight font-display">
            Operación retail<br />con Nexo
          </h2>
          <div className="space-y-4">
            {[
              { key: 'v', icon: <ShoppingCart size={18} />, title: 'Ventas rápidas', desc: 'Procesa ventas con múltiples métodos de pago' },
              { key: 'i', icon: <Package size={18} />,      title: 'Inventario en tiempo real', desc: 'Control total de stock y categorías' },
              { key: 'r', icon: <BarChart2 size={18} />,    title: `${uiLabels.reportes} detallados`, desc: 'Métricas y análisis de tu negocio' },
            ].map((f) => (
              <div key={f.key} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-primary-200 shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/50 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-xs">{copyrightLine()}</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo mobile + back */}
          <div className="flex items-center justify-between mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <NexoIcon className="w-full h-full" ariaLabel="Nexo" />
              </div>
              <span className="font-bold text-navy-800 text-lg">{appBrand.shortName}</span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-navy-400 hover:text-navy-700 text-xs font-medium transition-colors"
            >
              <ArrowLeft size={13} /> Inicio
            </Link>
          </div>

          <h2 className="text-2xl font-bold text-navy-800 mb-1 font-display">Bienvenido de vuelta</h2>
          <p className="text-sm text-navy-400 mb-8">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-navy-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                id="login-email"
                className="input-field"
                placeholder="usuario@ejemplo.com"
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="login-email-error" className="text-xs text-rose-500 mt-1.5" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-navy-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                id="login-password"
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                {...register('password')}
              />
              {errors.password && (
                <p id="login-password-error" className="text-xs text-rose-500 mt-1.5" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>

          <p className="text-center text-xs text-navy-400 mt-8">
            <Link href="/terminos" className="underline hover:text-navy-600">
              Términos del servicio
            </Link>
            <span className="mx-2 text-navy-300">·</span>
            <Link href="/privacidad" className="underline hover:text-navy-600">
              Privacidad
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}

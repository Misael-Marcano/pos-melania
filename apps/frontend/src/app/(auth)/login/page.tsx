'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { ShoppingCart, Package, BarChart2 } from 'lucide-react';

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
      await login(data.email, data.password);
      router.replace('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo decorativo */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#273727] flex-col justify-between p-12 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3D4E3D]/60 via-transparent to-[#1a2618]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-900/50">
            <span className="text-white font-extrabold text-sm">POS</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Melania</p>
            <p className="text-white/40 text-xs mt-0.5">Sopa EIRL</p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight font-display">
            Sistema de punto<br />de venta completo
          </h2>
          <div className="space-y-4">
            {[
              { icon: <ShoppingCart size={18} />, title: 'Ventas rápidas', desc: 'Procesa ventas con múltiples métodos de pago' },
              { icon: <Package size={18} />,      title: 'Inventario en tiempo real', desc: 'Control total de stock y categorías' },
              { icon: <BarChart2 size={18} />,    title: 'Reportes detallados', desc: 'Métricas y análisis de tu negocio' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
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

        <p className="relative text-white/20 text-xs">© 2025 Melania Sopa EIRL. Todos los derechos reservados.</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-white font-extrabold text-xs">POS</span>
            </div>
            <span className="font-bold text-navy-800 text-lg">Melania Sopa</span>
          </div>

          <h1 className="text-2xl font-bold text-navy-800 mb-1 font-display">Bienvenido de vuelta</h1>
          <p className="text-sm text-navy-400 mb-8">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                {...register('email')}
                className="input-field"
                placeholder="usuario@pos.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-rose-500 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                {...register('password')}
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-xs text-rose-500 mt-1.5">{errors.password.message}</p>
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

        </div>
      </div>
    </div>
  );
}

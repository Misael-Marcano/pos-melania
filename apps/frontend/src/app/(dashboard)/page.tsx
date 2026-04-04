'use client';

import { useAuthStore }         from '@/store/auth.store';
import { StatsCards }           from '@/components/dashboard/StatsCards';
import { SalesChart }           from '@/components/dashboard/SalesChart';
import { QuickActions }         from '@/components/dashboard/QuickActions';
import { StockBajoWidget }      from '@/components/dashboard/StockBajoWidget';
import { ClientesDeudaWidget }  from '@/components/dashboard/ClientesDeudaWidget';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatFechaLarga() {
  return new Date().toLocaleDateString('es-DO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function GreetingBanner() {
  const user = useAuthStore((s) => s.user);
  const nombre = user?.nombre?.split(' ')[0] ?? '';

  return (
    <div className="relative bg-gradient-to-br from-[#273727] to-[#3D4E3D] rounded-[12px] px-6 py-5 text-white overflow-hidden">
      {/* decorative circles */}
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 right-16 w-20 h-20 rounded-full bg-white/5" />
      <div className="absolute top-4 right-36 w-8 h-8 rounded-full bg-white/10" />

      <div className="relative">
        <p className="text-sm text-white/60 capitalize">{formatFechaLarga()}</p>
        <h1 className="text-2xl font-bold mt-0.5">
          {getGreeting()}{nombre ? `, ${nombre}` : ''}!
        </h1>
        <p className="text-sm text-white/70 mt-1">
          Aquí tienes el resumen de hoy. Que sea un excelente día.
        </p>
      </div>
    </div>
  );
}

export default function PanelPage() {
  return (
    <div className="space-y-6">
      <GreetingBanner />
      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StockBajoWidget />
        <ClientesDeudaWidget />
      </div>
    </div>
  );
}

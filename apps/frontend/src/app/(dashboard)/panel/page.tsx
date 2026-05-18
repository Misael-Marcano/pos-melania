'use client';

import { useState } from 'react';
import { useAuthStore }         from '@/store/auth.store';
import { useStockBajo }         from '@/hooks/useInventario';
import { PanelTiendaFilter, type PanelTiendaFilterValue } from '@/components/dashboard/PanelTiendaFilter';
import { StatsCards }           from '@/components/dashboard/StatsCards';
import { SalesChart }           from '@/components/dashboard/SalesChart';
import { QuickActions }         from '@/components/dashboard/QuickActions';
import { StockBajoWidget }      from '@/components/dashboard/StockBajoWidget';
import { ClientesDeudaWidget }  from '@/components/dashboard/ClientesDeudaWidget';
import { CajaAbiertaWidget }    from '@/components/dashboard/CajaAbiertaWidget';

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
    <div
      className="relative rounded-[12px] px-6 py-6 text-white overflow-hidden shadow-card
        bg-gradient-to-br from-[#273727] via-[#2f3d2f] to-[#3D4E3D]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_55%)] pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.06] blur-2xl" />
      <div className="absolute -bottom-12 right-24 w-28 h-28 rounded-full bg-primary-200/10 blur-xl" />
      <div className="relative">
        <p className="text-sm text-white/55 capitalize tracking-wide font-medium">{formatFechaLarga()}</p>
        <h1 id="panel-heading" className="text-2xl sm:text-[1.75rem] font-bold mt-1 font-display tracking-tight">
          {getGreeting()}{nombre ? `, ${nombre}` : ''}!
        </h1>
        <p className="text-sm text-white/65 mt-2 max-w-xl leading-relaxed">
          Resumen del día en un vistazo. Ventas, inventario y cuentas al día.
        </p>
      </div>
    </div>
  );
}

export default function PanelPage() {
  const [tiendaId, setTiendaId] = useState<PanelTiendaFilterValue>(null);
  const stockQuery = useStockBajo();
  const stockCount = stockQuery.data?.length ?? 0;
  const stockErrorMsg = stockQuery.error instanceof Error
    ? stockQuery.error.message
    : 'No se pudo cargar stock bajo';

  return (
    <main aria-labelledby="panel-heading" className="space-y-8">
      <GreetingBanner />
      <CajaAbiertaWidget />
      <PanelTiendaFilter value={tiendaId} onChange={setTiendaId} />
      <StatsCards stockCount={stockCount} tiendaId={tiendaId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart tiendaId={tiendaId} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StockBajoWidget
          data={stockQuery.data}
          isLoading={stockQuery.isLoading}
          isError={stockQuery.isError}
          errorMessage={stockErrorMsg}
          onRetry={() => void stockQuery.refetch()}
        />
        <ClientesDeudaWidget />
      </div>
    </main>
  );
}

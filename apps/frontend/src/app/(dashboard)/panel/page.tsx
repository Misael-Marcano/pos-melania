'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore }         from '@/store/auth.store';
import { usePanelResumen }      from '@/hooks/usePanelResumen';
import { QueryError }           from '@/components/reportes/reportes-shared';
import type { IArticulo } from '@pos/shared';
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
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const todayStr = new Date().toISOString().split('T')[0];
  const [tiendaId, setTiendaId] = useState<PanelTiendaFilterValue>(null);
  const [fecha, setFecha] = useState(todayStr);

  useEffect(() => {
    if (user?.rol === 'contador') router.replace('/reportes');
  }, [user?.rol, router]);

  const { data: panel, isLoading, isError, error, refetch } = usePanelResumen(fecha, tiendaId);
  const errorMsg = error instanceof Error ? error.message : 'No se pudo cargar el panel';
  const stockItems = (panel?.stockBajo.items ?? []) as IArticulo[];

  return (
    <section aria-labelledby="panel-heading" className="space-y-8">
      <GreetingBanner />
      <CajaAbiertaWidget />
      <PanelTiendaFilter value={tiendaId} onChange={setTiendaId} />

      {isError && <QueryError message={errorMsg} onRetry={() => void refetch()} />}

      {!isError && (
        <>
      <StatsCards
        fecha={fecha}
        onFechaChange={setFecha}
        stockCount={panel?.stockBajo.count ?? 0}
        tiendaId={tiendaId}
        resumen={panel?.resumen}
        resumenAnterior={panel?.resumenAnterior}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart
            tiendaId={tiendaId}
            ventasPorDia={panel?.ventasPorDia}
            isLoading={isLoading}
          />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StockBajoWidget
          data={stockItems}
          isLoading={isLoading}
          isError={false}
          onRetry={() => void refetch()}
        />
        <ClientesDeudaWidget
          clientes={panel?.cartera.clientes}
          totalDeuda={panel?.cartera.totalDeuda}
          isLoading={isLoading}
        />
      </div>
        </>
      )}
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useTiendas } from '@/hooks/useTiendas';
import { PageHeader } from '@/components/layout/PageHeader';
import { reportesPageTitle, reportesTabs, uiLabels } from '@/lib/ui-labels';
import {
  BarChart3, DollarSign, Package, Users, Store, FileText, ClipboardList, Layers,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { DateFilter } from '@/components/reportes/DateFilter';
import { getDefaultDates } from '@/components/reportes/reportes-shared';
import { TabVentas } from '@/components/reportes/TabVentas';
import { TabPnL } from '@/components/reportes/TabPnL';
import { TabInventario } from '@/components/reportes/TabInventario';
import { TabClientes } from '@/components/reportes/TabClientes';
import { TabAuditoria } from '@/components/reportes/TabAuditoria';
import { TabPorSucursal } from '@/components/reportes/TabPorSucursal';
import { TabDGII } from '@/components/reportes/TabDGII';
import { TabOperaciones } from '@/components/reportes/TabOperaciones';

type Tab = 'ventas' | 'pnl' | 'inventario' | 'clientes' | 'auditoria' | 'operaciones' | 'sucursal' | 'dgii';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'ventas',     label: reportesTabs.ventas,      icon: <BarChart3  size={15} /> },
  { id: 'pnl',        label: reportesTabs.pnl,         icon: <DollarSign size={15} /> },
  { id: 'inventario', label: reportesTabs.inventario,  icon: <Package    size={15} /> },
  { id: 'clientes',   label: reportesTabs.clientes,    icon: <Users      size={15} /> },
  { id: 'auditoria',  label: reportesTabs.auditoria,   icon: <ClipboardList size={15} /> },
  { id: 'operaciones', label: reportesTabs.operaciones, icon: <Layers   size={15} /> },
  { id: 'sucursal',   label: reportesTabs.sucursal,    icon: <Store      size={15} /> },
  { id: 'dgii',       label: reportesTabs.dgii,        icon: <FileText   size={15} /> },
];

export default function ReportesPage() {
  const defaults = getDefaultDates();
  const user = useAuthStore((s) => s.user);
  const canFilterTiendas =
    user?.rol === 'admin' || user?.rol === 'contador' || user?.rol === 'plataforma';
  const { data: tiendas = [] } = useTiendas();
  const [tab,   setTab]   = useState<Tab>('ventas');
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [tiendaFiltro, setTiendaFiltro] = useState<number | ''>('');

  useEffect(() => {
    if (!canFilterTiendas && user?.tiendaId) setTiendaFiltro(user.tiendaId);
  }, [canFilterTiendas, user?.tiendaId]);

  const tiendaIdParam = tiendaFiltro === '' ? null : Number(tiendaFiltro);

  return (
    <main className="space-y-5" aria-labelledby="reportes-heading">
      <h1 id="reportes-heading" className="sr-only">
        {reportesPageTitle()}
      </h1>
      <PageHeader
        title={reportesPageTitle()}
        breadcrumb={[uiLabels.breadcrumbRoot, uiLabels.reportes]}
      />

      <div className="flex gap-1.5 flex-wrap bg-white rounded-[12px] shadow-card p-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-navy-600 hover:bg-navy-100'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab !== 'inventario' && tab !== 'dgii' && (
        <DateFilter
          desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta}
          tiendaId={tiendaFiltro} setTiendaId={setTiendaFiltro}
          tiendas={tiendas} isAdmin={canFilterTiendas} userTiendaId={user?.tiendaId}
        />
      )}

      {tab === 'ventas'     && <TabVentas     desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'pnl'        && <TabPnL        desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'inventario' && <TabInventario />}
      {tab === 'clientes'   && <TabClientes   desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'auditoria'  && <TabAuditoria  desde={desde} hasta={hasta} tiendaId={tiendaIdParam} />}
      {tab === 'operaciones' && <TabOperaciones desde={desde} hasta={hasta} />}
      {tab === 'sucursal'   && <TabPorSucursal desde={desde} hasta={hasta} />}
      {tab === 'dgii'       && <TabDGII />}
    </main>
  );
}

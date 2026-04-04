'use client';

import { useState, useMemo } from 'react';
import { useVentas } from '@/hooks/useVentas';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { IVenta } from '@pos/shared';
import { Eye, Loader2, Search, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { VentaModal } from '@/components/ventas/VentaModal';

const METODO_BADGE: Record<string, string> = {
  EFECTIVO: 'badge-green', TARJETA: 'badge-orange',
  TRANSFERENCIA: 'badge-gray', CREDITO: 'badge-red',
};

type EstadoFilter = 'todas' | 'activa' | 'anulada';

export default function VentasHistorialPage() {
  const user = useAuthStore((s) => s.user);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [page,   setPage]   = useState(1);
  const [desde,  setDesde]  = useState('');
  const [hasta,  setHasta]  = useState('');
  const [estado, setEstado] = useState<EstadoFilter>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [metodoFilter, setMetodoFilter] = useState('');

  const { data, isLoading, refetch } = useVentas(
    page, 20,
    desde || undefined,
    hasta || undefined,
    estado === 'todas' ? undefined : estado,
  );

  const ventas     = data?.data ?? [];
  const pagination = data?.pagination;

  // Client-side filter: busqueda + metodo
  const ventasFiltradas = useMemo(() => {
    let v = ventas;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      v = v.filter(venta =>
        String(venta.id).includes(q) ||
        (venta.cliente?.nombre ?? '').toLowerCase().includes(q)
      );
    }
    if (metodoFilter) v = v.filter(venta => venta.metodoPago === metodoFilter);
    return v;
  }, [ventas, busqueda, metodoFilter]);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [ventaModal, setVentaModal] = useState<IVenta | null>(null);

  const limpiarFiltros = () => {
    setDesde(''); setHasta(''); setEstado('todas');
    setBusqueda(''); setMetodoFilter(''); setPage(1);
  };

  const hayFiltros = desde || hasta || estado !== 'todas' || busqueda || metodoFilter;

  return (
    <>
    <div className="space-y-4">
      <PageHeader title="Historial de Ventas" breadcrumb={['Panel', 'Ventas', 'Historial']} />

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[12px] shadow-card p-4 space-y-3">
        {/* Buscador */}
        <div className="flex items-center gap-2 input-field py-2">
          <Search size={15} className="text-navy-400 shrink-0" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por # de venta o nombre del cliente..."
            className="flex-1 bg-transparent outline-none text-sm text-navy-700 placeholder-navy-300"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="text-navy-400 hover:text-navy-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros secundarios */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-navy-500 mb-1 block">Desde</label>
            <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPage(1); }} className="input-field w-40" />
          </div>
          <div>
            <label className="text-xs text-navy-500 mb-1 block">Hasta</label>
            <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPage(1); }} className="input-field w-40" />
          </div>
          <div>
            <label className="text-xs text-navy-500 mb-1 block">Método</label>
            <select value={metodoFilter} onChange={e => setMetodoFilter(e.target.value)} className="input-field">
              <option value="">Todos</option>
              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {(['todas', 'activa', 'anulada'] as EstadoFilter[]).map(e => (
              <button key={e} onClick={() => { setEstado(e); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  estado === e
                    ? 'bg-primary-600 text-white'
                    : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                }`}>
                {e === 'todas' ? 'Todas' : e === 'activa' ? 'Activas' : 'Anuladas'}
              </button>
            ))}
          </div>
          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-rose-500 transition-colors font-medium">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Tabla ────────────────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2.5 bg-navy-50 border-b border-navy-100/40 flex items-center gap-2">
          <span className="font-semibold text-sm text-navy-700">Lista de Ventas</span>
          <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
            {pagination?.total ?? 0}
          </span>
          {busqueda && ventasFiltradas.length !== ventas.length && (
            <span className="text-xs text-navy-400 ml-1">
              ({ventasFiltradas.length} resultado{ventasFiltradas.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Cliente</th>
                <th className="table-header text-center">Artículos</th>
                <th className="table-header">Método</th>
                <th className="table-header">NCF</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-center">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12">
                  <Loader2 className="animate-spin text-primary-400 mx-auto" size={22} />
                </td></tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-navy-400 text-sm">
                  Sin ventas en el período
                </td></tr>
              ) : ventasFiltradas.map((v: IVenta) => {
                const anulada = v.notas?.startsWith('[ANULADA]') ?? false;
                return (
                  <tr key={v.id} className={`table-row-hover ${anulada ? 'opacity-55' : ''}`}>
                    <td className="table-cell font-mono text-xs text-navy-600">
                      #{String(v.id).padStart(6, '0')}
                    </td>
                    <td className="table-cell text-sm text-navy-600">{formatDateTime(v.fecha)}</td>
                    <td className="table-cell font-medium text-navy-700">
                      {v.cliente?.nombre ?? <span className="text-navy-400 text-xs italic">Consumidor final</span>}
                    </td>
                    <td className="table-cell text-center text-navy-500">{v.detalles?.length ?? 0}</td>
                    <td className="table-cell">
                      <span className={METODO_BADGE[v.metodoPago] ?? 'badge-gray'}>{v.metodoPago}</span>
                    </td>
                    <td className="table-cell font-mono text-xs text-navy-400">{v.comprobante ?? '—'}</td>
                    <td className="table-cell text-right font-bold text-navy-800">{formatCurrency(v.total)}</td>
                    <td className="table-cell text-center">
                      {anulada
                        ? <span className="badge-red text-[10px]">ANULADA</span>
                        : <span className="badge-green text-[10px]">ACTIVA</span>}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => setVentaModal(v)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                      >
                        <Eye size={13} /> Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-1 p-3 justify-center border-t border-navy-100/40">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 text-xs rounded bg-navy-100 text-navy-600 disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs rounded ${p === page ? 'bg-primary-500 text-white' : 'bg-navy-100 text-navy-600'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
              className="px-3 py-1 text-xs rounded bg-navy-100 text-navy-600 disabled:opacity-40">›</button>
          </div>
        )}
      </div>
    </div>

    {/* VentaModal unificado */}
    {ventaModal && (
      <VentaModal
        venta={ventaModal}
        isAdmin={user?.rol === 'admin'}
        onClose={() => setVentaModal(null)}
        onRefresh={() => { refetch(); setVentaModal(null); }}
      />
    )}
    </>
  );
}

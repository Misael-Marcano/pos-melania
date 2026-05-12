'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useCotizaciones,
  useConvertirAVenta,
  useEliminarCotizacion,
} from '@/hooks/useCotizaciones';
import { cotizacionesService } from '@/services/cotizaciones.service';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { ICotizacion, EstadoCotizacion } from '@pos/shared';
import { Eye, Loader2, Plus, RefreshCw, Trash2, ShoppingCart } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { Select } from '@/components/ui/Select';
import { toast } from '@/store/toast.store';
import { NuevaCotizacionModal } from '@/components/cotizaciones/NuevaCotizacionModal';

const ESTADOS: { id: EstadoCotizacion | ''; label: string }[] = [
  { id: '', label: 'Todos' },
  { id: 'BORRADOR', label: 'Borrador' },
  { id: 'ENVIADA', label: 'Enviada' },
  { id: 'ACEPTADA', label: 'Aceptada' },
  { id: 'RECHAZADA', label: 'Rechazada' },
  { id: 'VENCIDA', label: 'Vencida' },
];

function estadoBadge(e: EstadoCotizacion) {
  const map: Record<EstadoCotizacion, string> = {
    BORRADOR:  'badge-gray',
    ENVIADA:   'badge-blue',
    ACEPTADA:  'badge-green',
    RECHAZADA: 'badge-red',
    VENCIDA:   'badge-orange',
  };
  return map[e] ?? 'badge-gray';
}

export default function CotizacionesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<EstadoCotizacion | ''>('');
  const [detalle, setDetalle] = useState<ICotizacion | null>(null);
  const [nuevaOpen, setNuevaOpen] = useState(false);

  const { data, isLoading } = useCotizaciones(page, 20, estado);
  const rows = data?.data ?? [];
  const pag = data?.pagination;

  const convertir = useConvertirAVenta();
  const eliminar  = useEliminarCotizacion();

  const checkVencidas = useMutation({
    mutationFn: () => cotizacionesService.checkVencidas(),
    onSuccess: (r) => {
      toast.success(r.actualizadas ? `${r.actualizadas} cotización(es) marcadas como vencidas` : 'Sin cambios');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main aria-labelledby="cotizaciones-heading" className="space-y-6">
      <h1 id="cotizaciones-heading" className="sr-only">
        Cotizaciones
      </h1>
      <PageHeader
        title="Cotizaciones"
        breadcrumb={['Ventas', 'Cotizaciones']}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNuevaOpen(true)}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Nueva cotización
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => checkVencidas.mutate()}
                disabled={checkVencidas.isPending}
                className="btn-outline inline-flex items-center gap-2 text-sm"
              >
                {checkVencidas.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Actualizar vencidas
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-navy-500">Estado</label>
        <Select
          wrapperClassName="w-auto min-w-[160px] shrink-0"
          value={estado}
          onChange={(e) => { setEstado(e.target.value as EstadoCotizacion | ''); setPage(1); }}
          className="py-2.5 text-sm"
        >
          {ESTADOS.map((o) => (
            <option key={o.id || 'all'} value={o.id}>{o.label}</option>
          ))}
        </Select>
      </div>

      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th className="table-header text-left">#</th>
                <th className="table-header text-left">Cliente</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-left">Estado</th>
                <th className="table-header text-left">Fecha</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-12 text-navy-400">
                    <Loader2 className="inline animate-spin mr-2" size={18} />
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-10 text-navy-400">
                    No hay cotizaciones con este filtro.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="table-row-hover">
                    <td className="table-cell font-mono text-xs">{c.id}</td>
                    <td className="table-cell">{c.cliente?.nombre ?? '—'}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(Number(c.total))}</td>
                    <td className="table-cell">
                      <span className={estadoBadge(c.estado)}>{c.estado}</span>
                    </td>
                    <td className="table-cell text-xs text-navy-500">
                      {new Date(c.createdAt).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="table-cell text-right">
                      <button
                        type="button"
                        onClick={() => setDetalle(c)}
                        className="btn-ghost inline-flex items-center gap-1 text-xs py-1.5"
                      >
                        <Eye size={14} /> Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pag && pag.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-navy-50/50 text-sm text-navy-600">
            <span>Página {pag.page} de {pag.totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-outline text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= pag.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-outline text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <NuevaCotizacionModal open={nuevaOpen} onClose={() => setNuevaOpen(false)} />

      {detalle && (
        <ModalOverlay onClose={() => setDetalle(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-navy-100/50 flex items-center justify-between">
              <h3 className="font-semibold text-navy-800 font-display">Cotización #{detalle.id}</h3>
              <span className={estadoBadge(detalle.estado)}>{detalle.estado}</span>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <p><span className="text-navy-400">Cliente:</span>{' '}
                <span className="text-navy-800 font-medium">{detalle.cliente?.nombre ?? '—'}</span>
              </p>
              {detalle.notas && (
                <p className="text-navy-600"><span className="text-navy-400">Notas:</span> {detalle.notas}</p>
              )}
              <div className="rounded-xl bg-navy-50/80 p-3 space-y-2">
                {detalle.detalles?.map((d) => (
                  <div key={d.id} className="flex justify-between gap-2 text-xs sm:text-sm">
                    <span className="truncate text-navy-700">{d.articulo?.nombre ?? 'Artículo'}</span>
                    <span className="shrink-0 text-navy-500">{d.cantidad} × {formatCurrency(Number(d.precioUnitario))}</span>
                  </div>
                ))}
              </div>
              <p className="text-right font-bold text-navy-800 pt-2">
                Total {formatCurrency(Number(detalle.total))}
              </p>

              {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-navy-100/50">
                  {(detalle.estado === 'ENVIADA' || detalle.estado === 'ACEPTADA') && (
                    <button
                      type="button"
                      disabled={convertir.isPending}
                      onClick={async () => {
                        try {
                          await convertir.mutateAsync(detalle.id);
                          setDetalle(null);
                        } catch { /* toast in hook */ }
                      }}
                      className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                      {convertir.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                      Convertir a venta
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={eliminar.isPending}
                    onClick={async () => {
                      if (!confirm('¿Eliminar esta cotización?')) return;
                      try {
                        await eliminar.mutateAsync(detalle.id);
                        setDetalle(null);
                      } catch { /* toast in hook */ }
                    }}
                    className="btn-danger inline-flex items-center gap-2 text-sm"
                  >
                    {eliminar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </main>
  );
}

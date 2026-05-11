'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHistorialCajas, useCajasAbiertas, CAJA_KEY } from '@/hooks/useVentas';
import { ICajaApertura }     from '@/services/ventas.service';
import { ventasService }     from '@/services/ventas.service';
import { PageHeader }        from '@/components/layout/PageHeader';
import { formatCurrency }    from '@/lib/utils';
import { toast }             from '@/store/toast.store';
import { useAuthStore }      from '@/store/auth.store';
import { ModalOverlay }      from '@/components/ui/ModalOverlay';
import { CierreCaja }        from '@/components/ventas/CierreCaja';
import {
  Store, Calendar, User, DollarSign, ChevronLeft, ChevronRight,
  Download, CheckCircle, Clock, Lock, Building2,
} from 'lucide-react';

function fmt(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function duracion(apertura: string, cierre?: string) {
  if (!cierre) return null;
  const ms = new Date(cierre).getTime() - new Date(apertura).getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function StatusBadge({ cerrada }: { cerrada: boolean }) {
  return cerrada ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-navy-100 text-navy-500">
      <CheckCircle size={11} /> Cerrada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
      <Clock size={11} /> En curso
    </span>
  );
}

function CajaCard({ caja }: { caja: ICajaApertura }) {
  const cerrada  = !!caja.fechaCierre;
  const dur      = duracion(caja.fechaApertura, caja.fechaCierre);
  const diferencia = cerrada && caja.montoCierre !== undefined
    ? Number(caja.montoCierre) - Number(caja.montoApertura)
    : null;

  const [descargando, setDescargando] = useState(false);

  const handlePDF = async () => {
    if (!cerrada) return;
    setDescargando(true);
    try {
      await ventasService.pdfCierre(caja.id);
    } catch {
      toast.error('Error al descargar el PDF');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="bg-white rounded-[12px] shadow-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy-100 flex items-center justify-center shrink-0">
            <Store size={16} className="text-navy-500" />
          </div>
          <div>
            <p className="font-semibold text-navy-800 text-sm">{caja.cajaNombre}</p>
            <p className="text-[11px] text-navy-400">Sesión #{caja.id}</p>
          </div>
        </div>
        <StatusBadge cerrada={cerrada} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-navy-50 rounded-lg p-3">
          <p className="text-[10px] text-navy-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Calendar size={10} /> Apertura
          </p>
          <p className="text-xs font-medium text-navy-700">{fmt(caja.fechaApertura)}</p>
        </div>
        <div className="bg-navy-50 rounded-lg p-3">
          <p className="text-[10px] text-navy-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Calendar size={10} /> Cierre
          </p>
          <p className="text-xs font-medium text-navy-700">{fmt(caja.fechaCierre)}</p>
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <DollarSign size={10} /> Apertura
          </p>
          <p className="text-sm font-bold text-navy-800">{formatCurrency(Number(caja.montoApertura))}</p>
        </div>
        {cerrada && (
          <div>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <DollarSign size={10} /> Cierre
            </p>
            <p className="text-sm font-bold text-navy-800">{formatCurrency(Number(caja.montoCierre))}</p>
          </div>
        )}
      </div>

      {/* Diferencia + duración */}
      {cerrada && (
        <div className="flex items-center justify-between pt-3 border-t border-navy-100/40">
          <div>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5">Diferencia</p>
            <p className={`text-sm font-bold ${diferencia! >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {diferencia! >= 0 ? '+' : ''}{formatCurrency(diferencia!)}
            </p>
          </div>
          {dur && (
            <div className="text-right">
              <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5">Duración</p>
              <p className="text-xs font-medium text-navy-600">{dur}</p>
            </div>
          )}
        </div>
      )}

      {/* Usuario + PDF */}
      <div className="flex items-center justify-between pt-3 border-t border-navy-100/40">
        {caja.usuario ? (
          <span className="flex items-center gap-1.5 text-xs text-navy-400">
            <User size={12} /> {caja.usuario.nombre}
          </span>
        ) : <span />}
        {cerrada && (
          <button
            onClick={handlePDF}
            disabled={descargando}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Download size={13} />
            {descargando ? 'Descargando…' : 'PDF'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CierresCajaPage() {
  const [page, setPage] = useState(1);
  const LIMIT = 12;
  const [cerrando, setCerrando] = useState<ICajaApertura | null>(null);
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const { data, isLoading } = useHistorialCajas(page, LIMIT);
  const cierres  = data?.data ?? [];
  const total    = data?.total ?? 0;
  const totalPag = Math.ceil(total / LIMIT);

  const { data: abiertas = [], isLoading: loadingAbiertas } = useCajasAbiertas();

  const invalidateCaja = () => {
    qc.invalidateQueries({ queryKey: [CAJA_KEY] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Cierres"
        breadcrumb={['Panel', 'Ventas', 'Cierres de Caja']}
      />

      {!loadingAbiertas && abiertas.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50/90 to-white border border-amber-100 rounded-[12px] p-5 shadow-card">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Lock size={20} className="text-amber-700" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-800">Cajas abiertas ahora</h2>
              <p className="text-xs text-navy-500 mt-1">
                {isAdmin
                  ? 'Como administrador puedes cerrar la sesión de cualquier caja y sucursal sin usar el POS.'
                  : 'Sesiones abiertas en tu sucursal. Puedes cerrar desde aquí sin ir al punto de venta.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {abiertas.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-navy-100 rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-navy-800 text-sm">{c.cajaNombre}</p>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Abierta
                  </span>
                </div>
                {c.tienda && (
                  <p className="text-xs text-navy-500 flex items-center gap-1">
                    <Building2 size={12} className="shrink-0" /> {c.tienda.nombre}
                  </p>
                )}
                {c.usuario && (
                  <p className="text-xs text-navy-400 flex items-center gap-1">
                    <User size={12} /> {c.usuario.nombre}
                  </p>
                )}
                <p className="text-[11px] text-navy-400">
                  Apertura · {fmt(c.fechaApertura)} · {formatCurrency(Number(c.montoApertura))}
                </p>
                <button
                  type="button"
                  onClick={() => setCerrando(c)}
                  className="mt-1 btn-primary text-xs py-2 w-full"
                >
                  Cerrar esta caja
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cerrando && (
        <ModalOverlay onClose={() => setCerrando(null)} zIndex="z-[300]">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[12px] shadow-float">
            <CierreCaja
              aperturaId={cerrando.id}
              montoApertura={Number(cerrando.montoApertura)}
              fechaApertura={cerrando.fechaApertura}
              cajaNombre={cerrando.cajaNombre}
              onCerrada={() => {
                setCerrando(null);
                invalidateCaja();
                toast.success('Caja cerrada');
              }}
              onVolver={() => setCerrando(null)}
            />
          </div>
        </ModalOverlay>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cierres.length === 0 ? (
        <div className="bg-white rounded-[12px] shadow-card flex flex-col items-center justify-center py-16 text-center">
          <Store size={44} className="text-navy-200 mb-3" />
          <p className="font-semibold text-navy-500">Sin registros de caja</p>
          <p className="text-sm text-navy-400 mt-1">Las sesiones de caja aparecerán aquí</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cierres.map((c) => <CajaCard key={c.id} caja={c} />)}
          </div>

          {totalPag > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-navy-200 text-navy-500 hover:bg-white disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-navy-600 font-medium">
                Página {page} de {totalPag}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPag, p + 1))}
                disabled={page === totalPag}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-navy-200 text-navy-500 hover:bg-white disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

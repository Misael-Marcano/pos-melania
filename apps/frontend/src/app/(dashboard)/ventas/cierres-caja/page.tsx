'use client';

import { useState } from 'react';
import { useHistorialCajas } from '@/hooks/useVentas';
import { ICajaApertura }     from '@/services/ventas.service';
import { ventasService }     from '@/services/ventas.service';
import { PageHeader }        from '@/components/layout/PageHeader';
import { formatCurrency }    from '@/lib/utils';
import { toast }             from '@/store/toast.store';
import {
  Store, Calendar, User, DollarSign, ChevronLeft, ChevronRight,
  Download, CheckCircle, Clock,
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

  const { data, isLoading } = useHistorialCajas(page, LIMIT);
  const cierres  = data?.data ?? [];
  const total    = data?.total ?? 0;
  const totalPag = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Cierres"
        breadcrumb={['Panel', 'Ventas', 'Cierres de Caja']}
      />

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

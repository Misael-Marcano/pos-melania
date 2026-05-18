'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHistorialCajas, useCajasAbiertas, CAJA_KEY } from '@/hooks/useVentas';
import {
  ICajaApertura,
  HistorialCajasFilters,
  HistorialCajasEstado,
  ventasService,
} from '@/services/ventas.service';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency } from '@/lib/utils';
import {
  formatCajaDateTime,
  formatSessionDuration,
  isIntegrationCajaSession,
} from '@/lib/caja-session';
import { toast } from '@/store/toast.store';
import { useAuthStore } from '@/store/auth.store';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { CierreCaja } from '@/components/ventas/CierreCaja';
import { useTiendas } from '@/hooks/useTiendas';
import { useCajas } from '@/hooks/useCajas';
import {
  Store, Calendar, User, DollarSign, ChevronLeft, ChevronRight,
  Download, CheckCircle, Clock, Lock, Building2, Filter, AlertTriangle,
} from 'lucide-react';

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
  const cerrada = !caja.abierta && !!caja.fechaCierre;
  const dur = formatSessionDuration(caja.fechaApertura, caja.fechaCierre);
  const conc = caja.conciliacion;
  const diferencia = conc?.diferencia ?? null;
  const esIntegracion = isIntegrationCajaSession(caja.cajaNombre);

  const [descargando, setDescargando] = useState(false);

  const handlePDF = async () => {
    if (!cerrada || caja.datosInconsistentes) return;
    setDescargando(true);
    try {
      await ventasService.pdfCierre(caja.id);
    } catch {
      toast.error('Error al descargar el PDF');
    } finally {
      setDescargando(false);
    }
  };

  const durLabel =
    dur.kind === 'ok'
      ? dur.label
      : dur.kind === 'inconsistent'
        ? 'Revisar fechas'
        : null;

  return (
    <article className="bg-white rounded-[12px] shadow-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-navy-100 flex items-center justify-center shrink-0">
            <Store size={16} className="text-navy-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-navy-800 text-sm truncate">{caja.cajaNombre}</p>
            <p className="text-[11px] text-navy-400">Sesión #{caja.id}</p>
            {caja.tienda && (
              <p className="text-[11px] text-navy-500 flex items-center gap-1 mt-0.5">
                <Building2 size={10} className="shrink-0" /> {caja.tienda.nombre}
              </p>
            )}
            {esIntegracion && (
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">Sesión de integración</p>
            )}
          </div>
        </div>
        <StatusBadge cerrada={cerrada} />
      </div>

      {caja.datosInconsistentes && (
        <p className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="shrink-0" />
          La fecha de cierre es anterior a la apertura. Revisa el registro.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-navy-50 rounded-lg p-3">
          <p className="text-[10px] text-navy-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Calendar size={10} /> Apertura
          </p>
          <p className="text-xs font-medium text-navy-700">{formatCajaDateTime(caja.fechaApertura)}</p>
        </div>
        <div className="bg-navy-50 rounded-lg p-3">
          <p className="text-[10px] text-navy-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Calendar size={10} /> Cierre
          </p>
          <p className="text-xs font-medium text-navy-700">{formatCajaDateTime(caja.fechaCierre)}</p>
        </div>
      </div>

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
              <DollarSign size={10} /> Conteo cierre
            </p>
            <p className="text-sm font-bold text-navy-800">{formatCurrency(Number(caja.montoCierre))}</p>
          </div>
        )}
      </div>

      {cerrada && conc && (
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-navy-100/40 pt-3">
          <div>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5">Ventas sesión</p>
            <p className="font-semibold text-navy-800">{formatCurrency(conc.totalVentas)}</p>
            <p className="text-[10px] text-navy-400">{conc.cantidadVentas} trans.</p>
          </div>
          <div>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5">Efectivo esperado</p>
            <p className="font-semibold text-navy-800">{formatCurrency(conc.efectivoEsperado)}</p>
            <p className="text-[10px] text-navy-400">
              Efectivo {formatCurrency(conc.totalEfectivo)} − gastos {formatCurrency(conc.totalGastos)}
            </p>
          </div>
        </div>
      )}

      {cerrada && diferencia != null && (
        <div className="flex items-center justify-between pt-3 border-t border-navy-100/40">
          <div>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5">
              Diferencia (conteo vs esperado)
              {conc?.cuadra === false && conc.alerta ? ` · ${conc.alerta}` : ''}
            </p>
            <p className={`text-sm font-bold ${diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
            </p>
            {conc?.cuadra && (
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Caja cuadra</p>
            )}
          </div>
          {durLabel && (
            <div className="text-right">
              <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-0.5">Duración</p>
              <p className="text-xs font-medium text-navy-600">{durLabel}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-navy-100/40">
        {caja.usuario ? (
          <span className="flex items-center gap-1.5 text-xs text-navy-400">
            <User size={12} /> {caja.usuario.nombre}
          </span>
        ) : <span />}
        {cerrada && !caja.datosInconsistentes && (
          <button
            type="button"
            onClick={handlePDF}
            disabled={descargando}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Download size={13} />
            {descargando ? 'Descargando…' : 'PDF'}
          </button>
        )}
      </div>
    </article>
  );
}

const ESTADO_OPTIONS: { value: HistorialCajasEstado; label: string }[] = [
  { value: 'cerrada', label: 'Cerradas' },
  { value: 'abierta', label: 'Abiertas' },
  { value: 'todas', label: 'Todas' },
];

export default function CierresCajaPage() {
  const [page, setPage] = useState(1);
  const LIMIT = 12;
  const [cerrando, setCerrando] = useState<ICajaApertura | null>(null);
  const [filtros, setFiltros] = useState<HistorialCajasFilters>({ estado: 'cerrada' });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const queryFilters = useMemo(
    () => ({ ...filtros, estado: filtros.estado ?? 'cerrada' }),
    [filtros],
  );

  const { data, isLoading } = useHistorialCajas(page, LIMIT, queryFilters);
  const cierres = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPag = Math.ceil(total / LIMIT);

  const { data: abiertas = [], isLoading: loadingAbiertas } = useCajasAbiertas();
  const { data: tiendas = [] } = useTiendas();
  const { data: cajas = [] } = useCajas();

  const invalidateCaja = () => {
    qc.invalidateQueries({ queryKey: [CAJA_KEY] });
  };

  const aplicarFiltro = (patch: Partial<HistorialCajasFilters>) => {
    setFiltros((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <main aria-labelledby="cierres-caja-heading" className="space-y-6">
        <h1 id="cierres-caja-heading" className="sr-only">
          Historial de Cierres
        </h1>
        <PageHeader
          title="Historial de Cierres"
          breadcrumb={['Panel', 'Ventas', 'Cierres de Caja']}
        />

        <div className="bg-white rounded-[12px] shadow-card p-4 space-y-3">
          <button
            type="button"
            onClick={() => setMostrarFiltros((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-navy-700"
          >
            <Filter size={16} />
            Filtros
            {mostrarFiltros ? ' (ocultar)' : ''}
          </button>
          {mostrarFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <label className="block">
                <span className="text-xs text-navy-500">Desde</span>
                <input
                  type="date"
                  className="input-field w-full mt-1"
                  value={filtros.desde ?? ''}
                  onChange={(e) => aplicarFiltro({ desde: e.target.value || undefined })}
                />
              </label>
              <label className="block">
                <span className="text-xs text-navy-500">Hasta</span>
                <input
                  type="date"
                  className="input-field w-full mt-1"
                  value={filtros.hasta ?? ''}
                  onChange={(e) => aplicarFiltro({ hasta: e.target.value || undefined })}
                />
              </label>
              {isAdmin && (
                <label className="block">
                  <span className="text-xs text-navy-500">Sucursal</span>
                  <select
                    className="input-field w-full mt-1"
                    value={filtros.tiendaId ?? ''}
                    onChange={(e) => aplicarFiltro({
                      tiendaId: e.target.value ? Number(e.target.value) : undefined,
                    })}
                  >
                    <option value="">Todas</option>
                    {tiendas.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-xs text-navy-500">Caja</span>
                <select
                  className="input-field w-full mt-1"
                  value={filtros.cajaId ?? ''}
                  onChange={(e) => aplicarFiltro({
                    cajaId: e.target.value ? Number(e.target.value) : undefined,
                  })}
                >
                  <option value="">Todas</option>
                  {cajas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-navy-500">Estado</span>
                <select
                  className="input-field w-full mt-1"
                  value={filtros.estado ?? 'cerrada'}
                  onChange={(e) => aplicarFiltro({ estado: e.target.value as HistorialCajasEstado })}
                >
                  {ESTADO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {isAdmin && (
                <label className="flex items-center gap-2 sm:col-span-2 pt-6">
                  <input
                    type="checkbox"
                    checked={!!filtros.incluirIntegracion}
                    onChange={(e) => aplicarFiltro({ incluirIntegracion: e.target.checked })}
                  />
                  <span className="text-xs text-navy-600">Incluir sesiones de prueba (INTEG)</span>
                </label>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-navy-500 bg-navy-50/80 border border-navy-100 rounded-lg px-4 py-2">
          La <strong>diferencia</strong> compara el conteo físico al cierre con el efectivo esperado
          (apertura + ventas en efectivo − gastos de la sesión), no solo el monto de apertura.
        </p>

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
                    ? 'Como administrador puedes cerrar la sesión de cualquier caja y sucursal sin abrir la pantalla de ventas.'
                    : 'Sesiones abiertas en tu sucursal. Puedes cerrar desde aquí sin abrir Nexo.'}
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
                    Apertura · {formatCajaDateTime(c.fechaApertura)} · {formatCurrency(Number(c.montoApertura))}
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

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cierres.length === 0 ? (
          <div className="bg-white rounded-[12px] shadow-card flex flex-col items-center justify-center py-16 text-center">
            <Store size={44} className="text-navy-200 mb-3" />
            <p className="font-semibold text-navy-500">Sin registros de caja</p>
            <p className="text-sm text-navy-400 mt-1">Ajusta los filtros o abre una sesión en ventas</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cierres.map((c) => <CajaCard key={c.id} caja={c} />)}
            </div>

            {totalPag > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
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
                  type="button"
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
      </main>

      {cerrando && (
        <ModalOverlay onClose={() => setCerrando(null)} zIndex="z-[300]">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[12px] shadow-float">
            <CierreCaja
              aperturaId={cerrando.id}
              montoApertura={Number(cerrando.montoApertura)}
              fechaApertura={cerrando.fechaApertura}
              cajaNombre={cerrando.cajaNombre}
              inModal
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
    </>
  );
}

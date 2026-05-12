'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCajasAbiertas, useCerrarCaja, useResumenCaja } from '@/hooks/useVentas';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Lock, Printer, ArrowLeft, TrendingUp, TrendingDown, Banknote, AlertTriangle, FileDown, Loader2,
  Building2, Receipt, Bike,
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { ventasService } from '@/services/ventas.service';

const MAX_CAJA_AMOUNT = 10_000_000;
const MAX_DENOMINATION_COUNT = 100_000;

const DENOMINACIONES = [
  { label: 'RDS 2,000', value: '2000' },
  { label: 'RDS 1,000', value: '1000' },
  { label: 'RDS 500',   value: '500'  },
  { label: 'RDS 200',   value: '200'  },
  { label: 'RDS 100',   value: '100'  },
  { label: 'RDS 50',    value: '50'   },
  { label: 'RDS 25',    value: '25'   },
  { label: 'RDS 10',    value: '10'   },
  { label: 'RDS 5',     value: '5'    },
  { label: 'RDS 1',     value: '1'    },
];

const DENOM_TABLE_HEAD =
  'text-left text-xs font-semibold text-navy-500 uppercase tracking-wider pb-2.5 border-b border-navy-100/60';

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Crédito',
  TARJETA_REGALO: 'Tarjeta regalo',
  OTRO: 'Otro',
};

function metodoLabel(m: string) {
  return METODO_LABEL[m] ?? m;
}

interface Props {
  aperturaId:    number;
  montoApertura: number;
  fechaApertura: string;
  cajaNombre:    string;
  onCerrada:     () => void;
  onVolver?:     () => void;
  /**
   * Cuando se usa dentro del modal de “Cierres de caja”, mejoramos semántica y foco.
   * (En POS no es un modal estricto.)
   */
  inModal?: boolean;
}

export function CierreCaja({ aperturaId, montoApertura, fechaApertura, cajaNombre, onCerrada, onVolver, inModal }: Props) {
  const { data: resumen, isLoading: resumenLoading } = useResumenCaja(aperturaId);
  const { data: cajasAbiertas = [], isLoading: cajasAbiertasLoading } = useCajasAbiertas();

  const otrasCajas = useMemo(
    () => cajasAbiertas.filter((c) => c.id !== aperturaId),
    [cajasAbiertas, aperturaId]
  );

  const filasMetodo = useMemo(() => {
    if (!resumen) return [];
    if (resumen.totalesPorMetodoReal?.length)
      return [...resumen.totalesPorMetodoReal].sort((a, b) => a.metodo.localeCompare(b.metodo));
    return (resumen.porMetodo ?? [])
      .map((x) => ({ metodo: x.metodoPago, total: x.total }))
      .sort((a, b) => a.metodo.localeCompare(b.metodo));
  }, [resumen]);

  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(DENOMINACIONES.map((d) => [d.value, 0]))
  );
  const [notas, setNotas]         = useState('');
  const [resultado, setResultado] = useState<unknown>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [intentoCerrar, setIntentoCerrar] = useState(false);
  const cerrar = useCerrarCaja();

  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const confirmarYesRef = useRef<HTMLButtonElement | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const handleDescargarPDF = async () => {
    setPdfLoading(true);
    try {
      setErrorMsg('');
      await ventasService.pdfCierre(aperturaId);
    } catch {
      toast.error('Error al generar el PDF');
      setErrorMsg('No se pudo generar el PDF del cierre.');
    } finally {
      setPdfLoading(false);
    }
  };

  const montoContado = DENOMINACIONES.reduce(
    (acc, d) => acc + (cantidades[d.value] || 0) * Number(d.value), 0
  );

  const totalEfectivo    = Number(resumen?.totalEfectivo ?? 0);
  const totalGastos      = Number(resumen?.totalGastos   ?? 0);
  const totalDelivery    = Number(resumen?.totalDelivery ?? 0);
  const efectivoEsperado = montoApertura + totalEfectivo - totalGastos;
  const diferencia       = montoContado - efectivoEsperado;

  const cantidadVentas = resumen?.cantidadVentas ?? 0;
  const totalVentas    = Number(resumen?.totalVentas ?? 0);
  const tiendaNombre   = resumen?.tiendaNombre ?? null;
  const gastosLista    = resumen?.gastos ?? [];

  const cierreCargando = resumenLoading;

  // Validaciones de cierre
  const sinConteo         = montoContado === 0;
  const montoInsuficiente = montoContado > 0 && montoContado < efectivoEsperado;
  const montoExcesivo     = montoContado > MAX_CAJA_AMOUNT;
  const puedesCerrar      = !cierreCargando && !sinConteo && !montoExcesivo && !cerrar.isPending;
  const hayDiferencia     = !sinConteo && Math.abs(diferencia) > 0.009;

  let mensajeBloqueo = '';
  if (cierreCargando) mensajeBloqueo = 'Cargando resumen de la sesión...';
  else if (sinConteo) mensajeBloqueo = 'Ingresa el efectivo disponible en caja para continuar.';
  else if (montoExcesivo) mensajeBloqueo = 'El monto contado excede el máximo permitido.';

  const mensajeAdvertencia = montoInsuficiente
    ? `Hay un faltante de ${formatCurrency(efectivoEsperado - montoContado)}. Puedes cerrar, pero quedará registrado en la diferencia.`
    : hayDiferencia && diferencia > 0
      ? `Hay un sobrante de ${formatCurrency(diferencia)}. Confirma el cierre solo si el conteo fue revisado.`
      : '';

  const handleChange = (valor: string, cantidad: string) => {
    const parsed = Number.parseInt(cantidad, 10);
    const n = Number.isFinite(parsed)
      ? Math.min(MAX_DENOMINATION_COUNT, Math.max(0, parsed))
      : 0;
    setCantidades((prev) => ({ ...prev, [valor]: n }));
    setConfirmando(false);
    if (errorMsg) setErrorMsg('');
    setIntentoCerrar(false);
  };

  const handleCerrar = async () => {
    if (cerrar.isPending) return;
    if (!puedesCerrar) {
      setIntentoCerrar(true);
      return;
    }
    if (!confirmando) {
      setIntentoCerrar(true);
      setConfirmando(true);
      return;
    }
    setConfirmando(false);
    try {
      setErrorMsg('');
      const res = await cerrar.mutateAsync({
        aperturaId,
        denominaciones: cantidades,
        montoCierre: montoContado,
        notas,
      });
      setResultado(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cerrar caja';
      toast.error(msg);
      setErrorMsg(msg);
    }
  };

  useEffect(() => {
    if (resultado) return;
    if (resumenLoading || cajasAbiertasLoading) return;
    firstInputRef.current?.focus();
  }, [resultado, resumenLoading, cajasAbiertasLoading]);

  useEffect(() => {
    if (!confirmando) return;
    confirmarYesRef.current?.focus();
  }, [confirmando]);

  useEffect(() => {
    if (!resultado) return;
    successHeadingRef.current?.focus();
  }, [resultado]);

  useEffect(() => {
    if (!inModal || !onVolver) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cerrar.isPending) onVolver();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cerrar.isPending, inModal, onVolver]);

  // ── Pantalla de resultado ───────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6" role="status" aria-live="polite">
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden text-left">
          <div className="bg-gradient-to-br from-primary-600 to-primary-500 text-white px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto sm:mx-0 shrink-0" aria-hidden>
              <Lock size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left sm:text-left">
              <h3
                ref={successHeadingRef}
                tabIndex={-1}
                className="text-lg sm:text-xl font-bold font-display text-white mb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 rounded-sm"
              >
                Caja Cerrada
              </h3>
              <div className="text-xs sm:text-sm text-white/85 space-y-0.5">
                <p>{cajaNombre} — {formatDateTime(new Date().toISOString())}</p>
                {tiendaNombre && (
                  <p className="text-white/75 flex items-center gap-1.5">
                    <Building2 size={12} className="shrink-0" /> {tiendaNombre}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {filasMetodo.length > 0 && (
              <div className="bg-navy-50 rounded-[12px] border border-navy-100/60 p-4 text-left mb-4">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-navy-500 uppercase tracking-wider mb-2">
                  <Receipt size={12} /> Ventas por método (sesión)
                </div>
                <div className="space-y-1.5 mb-3">
                  {filasMetodo.map((row) => (
                    <div key={row.metodo} className="flex justify-between text-sm gap-2">
                      <span className="text-navy-600">{metodoLabel(row.metodo)}</span>
                      <span className="font-semibold text-navy-800 tabular-nums">{formatCurrency(row.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs border-t border-navy-200 pt-2 text-navy-600">
                  <span>{cantidadVentas} venta{cantidadVentas !== 1 ? 's' : ''}</span>
                  <span className="font-bold tabular-nums">Total {formatCurrency(totalVentas)}</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[12px] border border-navy-100/70 p-5 text-left space-y-3 mb-6 shadow-sm">
              <div className="flex justify-between text-sm gap-2">
                <span className="text-navy-500">Monto apertura</span>
                <span className="font-semibold text-navy-800 tabular-nums">{formatCurrency(montoApertura)}</span>
              </div>
              <div className="flex justify-between text-sm gap-2">
                <span className="text-navy-500">Ventas en efectivo</span>
                <span className="font-semibold text-emerald-600 tabular-nums">+ {formatCurrency(totalEfectivo)}</span>
              </div>
              <div className="flex justify-between text-sm gap-2">
                <span className="text-navy-500">Gastos del día</span>
                <span className="font-semibold text-rose-500 tabular-nums">- {formatCurrency(totalGastos)}</span>
              </div>
              {totalDelivery > 0 && (
                <div className="flex justify-between text-sm gap-2">
                  <span className="flex items-center gap-1 text-amber-600"><Bike size={12} /> Pagar al delivery</span>
                  <span className="font-semibold text-amber-600 tabular-nums">{formatCurrency(totalDelivery)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-navy-200 pt-2 gap-2">
                <span className="text-navy-600 font-medium">Efectivo esperado</span>
                <span className="font-bold text-navy-800 tabular-nums">{formatCurrency(efectivoEsperado)}</span>
              </div>
              <div className="flex justify-between text-sm gap-2">
                <span className="text-navy-500">Monto contado</span>
                <span className="font-semibold text-navy-800 tabular-nums">{formatCurrency(montoContado)}</span>
              </div>
              <div className={`flex justify-between text-sm font-bold border-t border-navy-200 pt-2 gap-2 ${
                diferencia >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                <span>Diferencia</span>
                <span className="tabular-nums">{diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}</span>
              </div>
            </div>

            <footer className="border-t border-navy-100 pt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => window.print()} className="btn-outline flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Printer size={15} /> Imprimir
                </button>
                <button type="button" onClick={handleDescargarPDF} disabled={pdfLoading} className="btn-outline flex items-center justify-center gap-2 w-full sm:w-auto">
                  {pdfLoading
                    ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
                    : <><FileDown size={15} /> Descargar PDF</>}
                </button>
              </div>
              <button type="button" onClick={onCerrada} className="btn-primary w-full sm:w-auto min-w-[10rem] shrink-0">
                Continuar
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario de cierre ────────────────────────────────────────────────────
  return (
    <section
      className="bg-white rounded-[12px] shadow-card w-full max-w-5xl mx-auto overflow-hidden flex flex-col"
      role={inModal ? 'dialog' : 'region'}
      aria-modal={inModal ? true : undefined}
      aria-labelledby="cierre-caja-heading"
      aria-busy={cerrar.isPending || cierreCargando}
      tabIndex={-1}
    >

      {/* Header — mismo patrón visual que AperturaCaja */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-500 text-white px-5 sm:px-6 py-4 flex flex-wrap items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0" aria-hidden>
          <Lock size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 id="cierre-caja-heading" className="font-semibold text-base sm:text-lg font-display text-white leading-tight">
            Cierre de Caja — {cajaNombre}
          </h2>
          <p className="text-white/80 text-xs sm:text-sm mt-1 leading-snug">
            Apertura: {formatDateTime(fechaApertura)}
            {tiendaNombre ? ` · ${tiendaNombre}` : ''}
          </p>
        </div>
        {onVolver && (
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white/90 border border-white/25 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} /> Volver
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-0 lg:divide-x lg:divide-navy-100 flex-1 min-h-0">

        {/* Tabla de denominaciones */}
        <div className="flex-1 p-5 sm:p-6 min-w-0">
          <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-4">
            Conteo de billetes y monedas
          </p>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[280px]">
              <thead>
                <tr>
                  <th scope="col" className={`${DENOM_TABLE_HEAD} pr-3`}>Denominación</th>
                  <th scope="col" className={`${DENOM_TABLE_HEAD} pr-3 w-[7.5rem]`}>Cantidad</th>
                  <th scope="col" className={`${DENOM_TABLE_HEAD} text-right pl-2 min-w-[5.5rem]`}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {DENOMINACIONES.map((den) => {
                  const sub = (cantidades[den.value] || 0) * Number(den.value);
                  const inputId = `cierre-den-${den.value}`;
                  const invalido =
                    intentoCerrar && (sinConteo || montoInsuficiente);
                  return (
                    <tr key={den.value} className="border-b border-navy-100/50 table-row-hover">
                      <td className="py-2.5 pr-3 align-middle">
                        <span className="text-sm font-medium text-navy-800">{den.label}</span>
                      </td>
                      <td className="py-2.5 pr-3 align-middle">
                        <label htmlFor={inputId} className="sr-only">
                          Cantidad para {den.label}
                        </label>
                        <input
                          ref={den.value === '2000' ? firstInputRef : undefined}
                          type="number"
                          inputMode="numeric"
                          id={inputId}
                          min={0}
                          max={MAX_DENOMINATION_COUNT}
                          step={1}
                          value={cantidades[den.value] || ''}
                          onChange={(e) => handleChange(den.value, e.target.value)}
                          aria-invalid={invalido}
                          className="w-full max-w-[7.5rem] input-field py-1.5 text-sm focus:ring-2 focus:ring-primary-400"
                          placeholder="0"
                          disabled={cerrar.isPending || cierreCargando || confirmando}
                        />
                      </td>
                      <td className="py-2.5 text-right align-middle text-sm font-semibold text-navy-700 tabular-nums">
                        {sub > 0 ? formatCurrency(sub) : <span className="text-navy-300 font-normal">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">
              Notas (opcional)
            </label>
            <label className="sr-only" htmlFor="cierre-notas">
              Notas del cierre
            </label>
            <textarea
              id="cierre-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={cerrar.isPending || cierreCargando || confirmando}
              className="input-field resize-none text-sm"
              placeholder="Observaciones del cierre..."
            />
          </div>
        </div>

        {/* Panel de resumen */}
        <div className="w-full lg:w-[22rem] xl:w-[26rem] shrink-0 p-5 sm:p-6 bg-navy-50/60 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider">Resumen del día</p>
            {tiendaNombre && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-2 py-0.5 max-w-[55%]">
                <Building2 size={10} className="shrink-0" />
                <span className="truncate">{tiendaNombre}</span>
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-[12px] p-4 sm:p-5 border border-primary-100/70 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-primary-700 uppercase tracking-wider mb-1">
                    Preview de cierre
                  </p>
                  <p className="text-xs text-navy-500 leading-tight">
                    Antes de guardar, revisa lo que se registrará en la sesión.
                  </p>
                </div>
                {cierreCargando && (
                  <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" aria-hidden />
                )}
              </div>

              <div className="space-y-1.5 text-[11px] text-navy-600">
                <div className="flex justify-between gap-2">
                  <span>Apertura</span>
                  <span className="font-semibold text-navy-800 tabular-nums">
                    {formatCurrency(montoApertura)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>montoCierre (contado)</span>
                  <span className="font-semibold text-navy-800 tabular-nums">
                    {cierreCargando || sinConteo ? '—' : formatCurrency(montoContado)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Efectivo esperado</span>
                  <span className="font-semibold text-navy-800 tabular-nums">
                    {cierreCargando ? '—' : formatCurrency(efectivoEsperado)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Diferencia</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      cierreCargando || sinConteo
                        ? 'text-navy-600'
                        : diferencia >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                    }`}
                  >
                    {cierreCargando || sinConteo
                      ? '—'
                      : `${diferencia >= 0 ? '+' : ''}${formatCurrency(diferencia)}`}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Notas</span>
                  <span className="font-semibold text-navy-800">
                    {notas.trim()
                      ? `${notas.trim().slice(0, 28)}${notas.trim().length > 28 ? '…' : ''}`
                      : '—'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-navy-400 mt-2 leading-snug">
                Se enviarán denominaciones, `montoCierre` y `notas`. Tras el cierre podrás descargar el PDF.
              </p>
            </div>

            <div className="flex justify-between text-[11px] text-navy-600 bg-white/80 rounded-lg px-3 py-2 border border-navy-100/80">
              <span className="flex items-center gap-1"><Receipt size={12} className="text-navy-400" /> Ventas en sesión</span>
              <span>
                <strong className="text-navy-800">{cantidadVentas}</strong>
                {' · '}
                <strong className="text-navy-800">{formatCurrency(totalVentas)}</strong>
              </span>
            </div>

            {otrasCajas.length > 0 && (
              <div className="bg-amber-50/90 rounded-lg px-2.5 py-2 border border-amber-100/80">
                <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
                  Otras cajas abiertas ({otrasCajas.length})
                </p>
                <ul className="max-h-14 overflow-y-auto space-y-0.5 text-[10px] leading-tight text-amber-900">
                  {otrasCajas.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2 min-w-0">
                      <span className="font-medium truncate" title={c.cajaNombre}>{c.cajaNombre}</span>
                      <span className="text-amber-800/85 shrink-0 tabular-nums">{c.tienda?.nombre ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {filasMetodo.length > 0 && (
              <div className="bg-white rounded-[12px] p-3 border border-navy-100/60">
                <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-2">Ingresos por método</p>
                <div className="space-y-1.5">
                  {filasMetodo.map((row) => (
                    <div key={row.metodo} className="flex justify-between text-sm gap-2">
                      <span className="text-navy-600">{metodoLabel(row.metodo)}</span>
                      <span className="font-semibold text-navy-800 tabular-nums">{formatCurrency(row.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gastosLista.length > 0 && (
              <div className="bg-white rounded-[12px] p-3 border border-navy-100/60">
                <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-2">
                  Gastos ({gastosLista.length})
                </p>
                <ul className="max-h-32 overflow-y-auto space-y-1.5 text-[11px] pr-1">
                  {gastosLista.map((g) => (
                    <li key={g.id} className="flex justify-between gap-2 border-b border-navy-50 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-navy-600 truncate" title={`${g.categoria} — ${g.escribe}`}>
                        {g.escribe}
                      </span>
                      <span className="text-rose-600 font-medium shrink-0 tabular-nums">{formatCurrency(g.cantidad)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Apertura */}
            <div className="bg-white rounded-[12px] p-3">
              <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">Apertura</p>
              <p className="text-lg font-bold text-navy-800">{formatCurrency(montoApertura)}</p>
            </div>

            {/* Ventas efectivo */}
            <div className="bg-white rounded-[12px] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={11} className="text-emerald-500" />
                <p className="text-[10px] text-navy-400 uppercase tracking-wider">Ventas efectivo</p>
              </div>
              <p className="text-base font-bold text-emerald-600">+ {formatCurrency(totalEfectivo)}</p>
            </div>

            {/* Gastos del día */}
            <div className="bg-white rounded-[12px] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={11} className="text-rose-500" />
                <p className="text-[10px] text-navy-400 uppercase tracking-wider">Gastos del día (total)</p>
              </div>
              <p className="text-base font-bold text-rose-500">- {formatCurrency(totalGastos)}</p>
            </div>

            {/* Delivery cobrado */}
            {totalDelivery > 0 && (
              <div className="bg-amber-50 rounded-[12px] p-3 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Bike size={11} className="text-amber-500" />
                  <p className="text-[10px] text-amber-600 uppercase tracking-wider">Pagar al delivery</p>
                </div>
                <p className="text-base font-bold text-amber-600">{formatCurrency(totalDelivery)}</p>
                <p className="text-[10px] text-amber-500 mt-0.5">Cobrado de clientes — entregar al repartidor</p>
              </div>
            )}

            {/* Esperado */}
            <div className="bg-navy-100 rounded-[12px] p-3">
              <p className="text-[10px] text-navy-500 uppercase tracking-wider mb-1">Efectivo esperado</p>
              <p className="text-base font-bold text-navy-700">{formatCurrency(efectivoEsperado)}</p>
            </div>

            {/* Contado */}
            <div className={`rounded-xl border p-3 ${
              sinConteo         ? 'bg-white border-navy-200' :
              montoInsuficiente ? 'bg-rose-50 border-rose-300' :
                                  'bg-white border-primary-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote size={11} className={montoInsuficiente ? 'text-rose-500' : 'text-primary-500'} />
                <p className="text-[10px] text-navy-400 uppercase tracking-wider">Contado</p>
              </div>
              <p className={`text-2xl font-bold ${
                sinConteo         ? 'text-navy-300' :
                montoInsuficiente ? 'text-rose-600' :
                                    'text-primary-600'
              }`}>
                {sinConteo ? '—' : formatCurrency(montoContado)}
              </p>
            </div>

            {/* Diferencia (sin alarmar antes de contar) */}
            <div
              className={`rounded-xl p-3 border ${
                sinConteo
                  ? 'bg-navy-50/80 border-navy-200/80'
                  : diferencia >= 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {!sinConteo && diferencia !== 0 && (
                  <AlertTriangle size={11} className={diferencia >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                )}
                <p
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    sinConteo ? 'text-navy-500' : diferencia >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  Diferencia
                </p>
              </div>
              {sinConteo ? (
                <>
                  <p className="text-lg font-bold text-navy-400">—</p>
                  <p className="text-[10px] text-navy-500 mt-1 leading-snug">Se calcula cuando ingreses el conteo de billetes y monedas.</p>
                </>
              ) : (
                <p className={`text-lg font-bold ${diferencia >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
                </p>
              )}
            </div>

            {/* Mensaje de validación */}
            {errorMsg && (
              <div
                className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3"
                role="alert"
                aria-live="assertive"
                id="cierre-error"
              >
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">{errorMsg}</p>
              </div>
            )}
            {mensajeBloqueo && (
              <div
                className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3"
                role="alert"
                aria-live="assertive"
                id="cierre-bloqueo"
              >
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">{mensajeBloqueo}</p>
              </div>
            )}
            {mensajeAdvertencia && (
              <div
                className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3"
                role="status"
                aria-live="polite"
              >
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">{mensajeAdvertencia}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-navy-100 bg-navy-50/50 px-4 sm:px-6 py-4 shrink-0">
        {confirmando && (
          <p className="text-xs text-center text-amber-600 font-semibold mb-3">
            {hayDiferencia ? '¿Confirmas el cierre con diferencia?' : '¿Confirmas el cierre?'}
          </p>
        )}
        <div
          className={
            confirmando
              ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
              : 'flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end'
          }
        >
          {confirmando ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={cerrar.isPending}
                className="btn-outline w-full sm:w-auto min-w-[6rem] py-2.5 text-sm"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleCerrar}
                disabled={cerrar.isPending || !puedesCerrar}
                ref={confirmarYesRef}
                className="btn-danger w-full sm:w-auto min-w-[11rem] flex items-center justify-center gap-2 py-2.5 text-sm"
                aria-busy={cerrar.isPending}
              >
                {cerrar.isPending
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                  : <Lock size={15} />}
                Sí, cerrar
              </button>
            </>
          ) : (
            <>
              <div className="hidden sm:block sm:flex-1" aria-hidden />
              <button
                type="button"
                onClick={handleCerrar}
                disabled={cerrar.isPending || !puedesCerrar}
                className="btn-danger w-full sm:w-auto min-w-[12rem] flex items-center justify-center gap-2 py-2.5"
              >
                {cerrar.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                ) : (
                  <>
                    <Lock size={15} /> Cerrar Caja
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </footer>
    </section>
  );
}

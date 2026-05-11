'use client';

import { useMemo, useState } from 'react';
import { useCajasAbiertas, useCerrarCaja, useResumenCaja } from '@/hooks/useVentas';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Lock, Printer, ArrowLeft, TrendingUp, TrendingDown, Banknote, AlertTriangle, FileDown, Loader2,
  Building2, Receipt, Bike,
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { ventasService } from '@/services/ventas.service';

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
}

export function CierreCaja({ aperturaId, montoApertura, fechaApertura, cajaNombre, onCerrada, onVolver }: Props) {
  const { data: resumen } = useResumenCaja(aperturaId);
  const { data: cajasAbiertas = [] } = useCajasAbiertas();

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
  const cerrar = useCerrarCaja();

  const handleDescargarPDF = async () => {
    setPdfLoading(true);
    try {
      await ventasService.pdfCierre(aperturaId);
    } catch {
      toast.error('Error al generar el PDF');
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

  // Validaciones de cierre
  const sinConteo         = montoContado === 0;
  const montoInsuficiente = montoContado > 0 && montoContado < efectivoEsperado;
  const puedesCerrar      = !sinConteo && !montoInsuficiente;

  let mensajeBloqueo = '';
  if (sinConteo) mensajeBloqueo = 'Ingresa el efectivo disponible en caja para continuar.';
  else if (montoInsuficiente)
    mensajeBloqueo = `Faltan ${formatCurrency(efectivoEsperado - montoContado)} para alcanzar el efectivo esperado.`;

  const handleChange = (valor: string, cantidad: string) => {
    setCantidades((prev) => ({ ...prev, [valor]: Math.max(0, parseInt(cantidad) || 0) }));
    setConfirmando(false);
  };

  const handleCerrar = async () => {
    if (!confirmando) { setConfirmando(true); return; }
    setConfirmando(false);
    try {
      const res = await cerrar.mutateAsync({
        aperturaId,
        denominaciones: cantidades,
        montoCierre: montoContado,
        notas,
      });
      setResultado(res);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al cerrar caja');
    }
  };

  // ── Pantalla de resultado ───────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-[12px] shadow-card p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock size={26} className="text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-navy-800 mb-1">Caja Cerrada</h3>
          <div className="text-sm text-navy-400 mb-4 space-y-1">
            <p>{cajaNombre} — {formatDateTime(new Date().toISOString())}</p>
            {tiendaNombre && (
              <p className="text-xs text-navy-500 flex items-center justify-center gap-1">
                <Building2 size={12} className="shrink-0" /> {tiendaNombre}
              </p>
            )}
          </div>

          {filasMetodo.length > 0 && (
            <div className="bg-navy-50 rounded-[12px] p-4 text-left mb-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-navy-500 uppercase tracking-wider mb-2">
                <Receipt size={12} /> Ventas por método (sesión)
              </div>
              <div className="space-y-1.5 mb-3">
                {filasMetodo.map((row) => (
                  <div key={row.metodo} className="flex justify-between text-sm">
                    <span className="text-navy-500">{metodoLabel(row.metodo)}</span>
                    <span className="font-semibold text-navy-800">{formatCurrency(row.total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs border-t border-navy-200 pt-2 text-navy-600">
                <span>{cantidadVentas} venta{cantidadVentas !== 1 ? 's' : ''}</span>
                <span className="font-bold">Total {formatCurrency(totalVentas)}</span>
              </div>
            </div>
          )}

          <div className="bg-navy-50 rounded-[12px] p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Monto apertura</span>
              <span className="font-semibold text-navy-700">{formatCurrency(montoApertura)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Ventas en efectivo</span>
              <span className="font-semibold text-emerald-600">+ {formatCurrency(totalEfectivo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Gastos del día</span>
              <span className="font-semibold text-rose-500">- {formatCurrency(totalGastos)}</span>
            </div>
            {totalDelivery > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-amber-600"><Bike size={12} /> Pagar al delivery</span>
                <span className="font-semibold text-amber-600">{formatCurrency(totalDelivery)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-navy-200 pt-2">
              <span className="text-navy-600 font-medium">Efectivo esperado</span>
              <span className="font-bold text-navy-800">{formatCurrency(efectivoEsperado)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Monto contado</span>
              <span className="font-semibold text-navy-700">{formatCurrency(montoContado)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold border-t border-navy-200 pt-2 ${
              diferencia >= 0 ? 'text-emerald-600' : 'text-rose-500'
            }`}>
              <span>Diferencia</span>
              <span>{diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            <button type="button" onClick={() => window.print()} className="btn-outline flex items-center gap-2">
              <Printer size={15} /> Imprimir
            </button>
            <button type="button" onClick={handleDescargarPDF} disabled={pdfLoading} className="btn-outline flex items-center gap-2">
              {pdfLoading
                ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
                : <><FileDown size={15} /> Descargar PDF</>}
            </button>
            <button type="button" onClick={onCerrada} className="btn-primary">Continuar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario de cierre ────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[12px] shadow-card w-full max-w-5xl mx-auto overflow-hidden">

      {/* Header */}
      <div className="bg-navy-700 text-white px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
          <Lock size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base">Cierre de Caja — {cajaNombre}</h2>
          <p className="text-navy-300 text-xs mt-0.5">
            Apertura: {formatDateTime(fechaApertura)}
            {tiendaNombre ? ` · ${tiendaNombre}` : ''}
          </p>
        </div>
        {onVolver && (
          <button
            type="button"
            onClick={onVolver}
            className="flex items-center gap-1.5 text-navy-300 hover:text-white text-sm font-medium transition-colors shrink-0"
          >
            <ArrowLeft size={15} /> Volver
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-0 lg:divide-x divide-navy-100">

        {/* Tabla de denominaciones */}
        <div className="flex-1 p-6 min-w-0">
          <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-4">Conteo de billetes y monedas</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-100/40">
                <th className="text-left text-xs font-semibold text-navy-500 pb-2.5">Denominación</th>
                <th className="text-left text-xs font-semibold text-navy-500 pb-2.5">Cantidad</th>
                <th className="text-right text-xs font-semibold text-navy-500 pb-2.5">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {DENOMINACIONES.map((den) => {
                const sub = (cantidades[den.value] || 0) * Number(den.value);
                return (
                  <tr key={den.value} className="border-b border-navy-50 group">
                    <td className="py-2 pr-4 text-sm font-medium text-navy-700">{den.label}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={0}
                        value={cantidades[den.value] || ''}
                        onChange={(e) => handleChange(den.value, e.target.value)}
                        className="w-24 input-field py-1.5 text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 text-right text-sm font-semibold text-navy-700">
                      {sub > 0 ? formatCurrency(sub) : <span className="text-navy-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-5">
            <label className="block text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input-field resize-none text-sm"
              placeholder="Observaciones del cierre..."
            />
          </div>
        </div>

        {/* Panel de resumen */}
        <div className="w-full lg:w-[22rem] xl:w-[26rem] shrink-0 p-5 bg-navy-50/60 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
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
            {mensajeBloqueo && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">{mensajeBloqueo}</p>
              </div>
            )}

            {/* Botón cierre */}
            {confirmando ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-center text-amber-600 font-semibold">¿Confirmas el cierre?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmando(false)} className="btn-outline w-full text-xs py-2">
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleCerrar}
                    disabled={cerrar.isPending || !puedesCerrar}
                    className="btn-danger w-full flex items-center justify-center gap-1 text-xs py-2"
                  >
                    {cerrar.isPending
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Lock size={13} />}
                    Sí, cerrar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCerrar}
                disabled={cerrar.isPending || !puedesCerrar}
                className="btn-danger w-full flex items-center justify-center gap-2 py-2.5 mt-1"
              >
                <Lock size={15} /> Cerrar Caja
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

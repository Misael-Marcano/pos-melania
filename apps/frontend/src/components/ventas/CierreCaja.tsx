'use client';

import { useState } from 'react';
import { useCerrarCaja, useResumenCaja } from '@/hooks/useVentas';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Lock, Printer, ArrowLeft, TrendingUp, TrendingDown, Banknote, AlertTriangle, FileDown, Loader2 } from 'lucide-react';
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

  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(DENOMINACIONES.map((d) => [d.value, 0]))
  );
  const [notas, setNotas]         = useState('');
  const [resultado, setResultado] = useState<any>(null);
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
  const efectivoEsperado = montoApertura + totalEfectivo - totalGastos;
  const diferencia       = montoContado - efectivoEsperado;

  // Validaciones de cierre
  const sinConteo      = montoContado === 0;
  const montoInsuficiente = montoContado > 0 && montoContado < efectivoEsperado;
  const puedesCerrar   = !sinConteo && !montoInsuficiente;

  let mensajeBloqueo = '';
  if (sinConteo)         mensajeBloqueo = 'Ingresa el efectivo disponible en caja para continuar.';
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
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-[12px] shadow-card p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock size={26} className="text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-navy-800 mb-1">Caja Cerrada</h3>
          <p className="text-sm text-navy-400 mb-6">{cajaNombre} — {formatDateTime(new Date().toISOString())}</p>

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
            <button onClick={() => window.print()} className="btn-outline flex items-center gap-2">
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={handleDescargarPDF} disabled={pdfLoading} className="btn-outline flex items-center gap-2">
              {pdfLoading
                ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
                : <><FileDown size={15} /> Descargar PDF</>}
            </button>
            <button onClick={onCerrada} className="btn-primary">Continuar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario de cierre ────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[12px] shadow-card w-full max-w-3xl mx-auto overflow-hidden">

      {/* Header */}
      <div className="bg-navy-700 text-white px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
          <Lock size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base">Cierre de Caja — {cajaNombre}</h2>
          <p className="text-navy-300 text-xs mt-0.5">Apertura: {formatDateTime(fechaApertura)}</p>
        </div>
        {onVolver && (
          <button
            onClick={onVolver}
            className="flex items-center gap-1.5 text-navy-300 hover:text-white text-sm font-medium transition-colors shrink-0"
          >
            <ArrowLeft size={15} /> Volver
          </button>
        )}
      </div>

      <div className="flex gap-0 divide-x divide-navy-100">

        {/* Tabla de denominaciones */}
        <div className="flex-1 p-6">
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
        <div className="w-60 shrink-0 p-5 bg-navy-50/60">
          <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-4">Resumen del día</p>

          <div className="space-y-3">
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
                <p className="text-[10px] text-navy-400 uppercase tracking-wider">Gastos del día</p>
              </div>
              <p className="text-base font-bold text-rose-500">- {formatCurrency(totalGastos)}</p>
            </div>

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

            {/* Diferencia */}
            <div className={`rounded-xl p-3 border ${
              diferencia >= 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {diferencia !== 0 && <AlertTriangle size={11} className={diferencia >= 0 ? 'text-emerald-500' : 'text-rose-500'} />}
                <p className={`text-[10px] uppercase tracking-wider font-semibold ${
                  diferencia >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  Diferencia
                </p>
              </div>
              <p className={`text-lg font-bold ${diferencia >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
              </p>
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
                  <button onClick={() => setConfirmando(false)} className="btn-outline w-full text-xs py-2">
                    No
                  </button>
                  <button
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
                onClick={handleCerrar}
                disabled={cerrar.isPending || !puedesCerrar}
                className="btn-danger w-full flex items-center justify-center gap-2 py-2.5 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
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

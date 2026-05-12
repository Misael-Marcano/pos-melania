'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAbrirCaja } from '@/hooks/useVentas';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Banknote, CheckCircle } from 'lucide-react';
import { toast } from '@/store/toast.store';

const MAX_CAJA_AMOUNT = 10_000_000;
const MAX_DENOMINATION_COUNT = 100_000;

const DENOMINACIONES = [
  { label: 'RDS 2000', value: '2000' },
  { label: 'RDS 1000', value: '1000' },
  { label: 'RDS 500',  value: '500'  },
  { label: 'RDS 200',  value: '200'  },
  { label: 'RDS 100',  value: '100'  },
  { label: 'RDS 50',   value: '50'   },
  { label: 'RDS 25',   value: '25'   },
  { label: 'RDS 10',   value: '10'   },
  { label: 'RDS 5',    value: '5'    },
  { label: 'RDS 1',    value: '1'    },
];

/** Shared table chrome with CierreCaja */
const DENOM_TABLE_HEAD =
  'text-left text-xs font-semibold text-navy-500 uppercase tracking-wider pb-2.5 border-b border-navy-100/60';

interface Props {
  cajaNombre: string;
  /** Catálogo (configuración) — abre sesión vinculada a la caja */
  cajaId?:    number | null;
  /** Sucursal (de configuración) — varias tiendas / una caja por sucursal */
  tiendaId?:  number | null;
  onAbierta:  (aperturaId: number) => void;
}

export function AperturaCaja({ cajaNombre, cajaId, tiendaId, onAbierta }: Props) {
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(DENOMINACIONES.map((d) => [d.value, 0]))
  );
  const abrir = useAbrirCaja();
  const [errorMsg, setErrorMsg] = useState('');
  const [attempted, setAttempted] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const montoTotal = useMemo(
    () => DENOMINACIONES.reduce((acc, d) => acc + (cantidades[d.value] || 0) * Number(d.value), 0),
    [cantidades]
  );

  const lineas = useMemo(
    () =>
      DENOMINACIONES.filter((d) => (cantidades[d.value] || 0) > 0).map((d) => ({
        value: d.value,
        label: d.label,
        cantidad: cantidades[d.value] || 0,
        subtotal: (cantidades[d.value] || 0) * Number(d.value),
      })),
    [cantidades]
  );

  const handleChange = (valor: string, cantidad: string) => {
    const parsed = Number.parseInt(cantidad, 10);
    const n = Number.isFinite(parsed)
      ? Math.min(MAX_DENOMINATION_COUNT, Math.max(0, parsed))
      : 0;
    setCantidades((prev) => ({ ...prev, [valor]: n }));
    if (attempted) setErrorMsg('');
  };

  const handleAbrir = async () => {
    if (abrir.isPending) return;
    setAttempted(true);

    if (montoTotal === 0) {
      setErrorMsg('Ingresa al menos una denominación para calcular el monto de apertura.');
      return;
    }
    if (montoTotal > MAX_CAJA_AMOUNT) {
      setErrorMsg('El monto de apertura excede el máximo permitido.');
      return;
    }

    try {
      setErrorMsg('');
      const result = await abrir.mutateAsync({
        denominaciones: cantidades,
        montoApertura:  montoTotal,
        ...(cajaId != null && cajaId > 0
          ? { cajaId }
          : { cajaNombre }),
        ...(tiendaId && (!cajaId || cajaId <= 0) ? { tiendaId } : {}),
      });
      toast.success('Caja abierta');
      onAbierta(result.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al abrir caja';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-navy-50 flex items-start justify-center p-4 sm:p-8">
      <div
        className="bg-white rounded-[12px] shadow-card w-full max-w-5xl overflow-hidden"
        role="region"
        aria-labelledby="apertura-caja-heading"
        aria-busy={abrir.isPending}
      >
        {/* Header — mismo patrón que CierreCaja */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-500 text-white px-5 sm:px-6 py-4 flex flex-wrap items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0" aria-hidden>
            <Banknote size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="apertura-caja-heading" className="font-semibold text-base sm:text-lg font-display text-white">
              Apertura de Caja
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5 leading-snug">
              Ingresa el efectivo inicial para comenzar operaciones
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-stretch gap-0 lg:divide-x lg:divide-navy-100">
          <form
            id="apertura-submit"
            className="flex-1 min-w-0 p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAbrir();
            }}
            aria-describedby={errorMsg ? 'apertura-error' : 'apertura-hint'}
          >
            <p className="sr-only" id="apertura-hint">
              Completa el conteo para calcular el monto de apertura.
            </p>

            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-4">
              Conteo de billetes y monedas
            </p>

            {errorMsg && (
              <div
                className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2"
                id="apertura-error"
                role="alert"
                aria-live="assertive"
              >
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">{errorMsg}</p>
              </div>
            )}

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[280px]" aria-label="Conteo de billetes y monedas">
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
                    const inputId = `apertura-den-${den.value}`;
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
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={MAX_DENOMINATION_COUNT}
                            step={1}
                            id={inputId}
                            value={cantidades[den.value] || ''}
                            onChange={(e) => handleChange(den.value, e.target.value)}
                            ref={den.value === '2000' ? firstInputRef : undefined}
                            disabled={abrir.isPending}
                            aria-invalid={attempted && montoTotal === 0}
                            className="w-full max-w-[7.5rem] input-field py-1.5 text-sm focus:ring-2 focus:ring-primary-400"
                            placeholder="0"
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
          </form>

          <aside
            className="w-full lg:w-[22rem] xl:w-[26rem] shrink-0 p-5 sm:p-6 bg-navy-50/60 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
            aria-label="Resumen de apertura"
          >
            <div className="bg-white rounded-[12px] border border-navy-100/70 p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] font-semibold text-primary-700 uppercase tracking-wider mb-4">
                Preview de apertura
              </p>

              <div className="mb-4">
                <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wider mb-1">Monto de Apertura</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-600 font-display tabular-nums">
                  {formatCurrency(montoTotal)}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wider mb-1.5">Caja activa</p>
                <div className="inline-flex w-full justify-center bg-gradient-to-br from-primary-600 to-primary-500 text-white text-sm font-medium px-3 py-2 rounded-lg text-center">
                  {cajaNombre}
                </div>
              </div>

              <div className="border-t border-navy-100 pt-3">
                <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wider mb-2">Desglose</p>
                {lineas.length > 0 ? (
                  <ul className="space-y-1.5">
                    {lineas.map((l) => (
                      <li key={l.value} className="flex justify-between gap-2 text-xs text-navy-600">
                        <span className="min-w-0 truncate">
                          {l.label} × {l.cantidad}
                        </span>
                        <span className="shrink-0 tabular-nums font-medium text-navy-800">{formatCurrency(l.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-navy-500 text-center py-6 px-2 rounded-lg bg-navy-50/80 border border-dashed border-navy-200/80">
                    Sin conteo todavía
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <footer className="border-t border-navy-100 bg-navy-50/50 px-4 sm:px-6 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-navy-600 leading-snug sm:max-w-md order-2 sm:order-1">
              Se guardará: conteo por denominación y `montoApertura` para esta sesión.
            </p>
            <button
              type="submit"
              form="apertura-submit"
              disabled={abrir.isPending || montoTotal === 0}
              className="btn-primary w-full sm:w-auto min-w-[10rem] shrink-0 flex items-center justify-center gap-2 py-2.5 order-1 sm:order-2 sm:ml-auto"
              aria-disabled={abrir.isPending || montoTotal === 0}
              aria-busy={abrir.isPending}
            >
              {abrir.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              {abrir.isPending ? 'Abriendo...' : 'Aceptar'}
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}

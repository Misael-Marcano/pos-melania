'use client';

import { useState } from 'react';
import { useAbrirCaja } from '@/hooks/useVentas';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, CheckCircle } from 'lucide-react';
import { toast } from '@/store/toast.store';

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

interface Props {
  cajaNombre: string;
  onAbierta:  (aperturaId: number) => void;
}

export function AperturaCaja({ cajaNombre, onAbierta }: Props) {
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(DENOMINACIONES.map((d) => [d.value, 0]))
  );
  const abrir = useAbrirCaja();

  const montoTotal = DENOMINACIONES.reduce(
    (acc, d) => acc + (cantidades[d.value] || 0) * Number(d.value),
    0
  );

  const handleChange = (valor: string, cantidad: string) => {
    const n = Math.max(0, parseInt(cantidad) || 0);
    setCantidades((prev) => ({ ...prev, [valor]: n }));
  };

  const handleAbrir = async () => {
    try {
      const result = await abrir.mutateAsync({
        cajaNombre,
        denominaciones: cantidades,
        montoApertura:  montoTotal,
      });
      onAbierta(result.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al abrir caja');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-navy-50 flex items-start justify-center p-8">
      <div className="bg-white rounded-[12px] shadow-card w-full max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-500 text-white px-6 py-4 rounded-t-[12px]">
          <h2 className="font-semibold text-lg font-display">Apertura de Caja</h2>
          <p className="text-white/70 text-sm">Ingresa el efectivo inicial para comenzar operaciones</p>
        </div>

        <div className="p-6 flex gap-8">
          {/* Denominaciones */}
          <div className="flex-1">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-sm font-semibold text-navy-500 pb-3 border-b border-navy-100/40">Denominación</th>
                  <th className="text-left text-sm font-semibold text-navy-500 pb-3 border-b border-navy-100/40">Cantidad</th>
                  <th className="text-right text-sm font-semibold text-navy-500 pb-3 border-b border-navy-100/40">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {DENOMINACIONES.map((den) => {
                  const sub = (cantidades[den.value] || 0) * Number(den.value);
                  return (
                    <tr key={den.value} className="border-b border-navy-100/40">
                      <td className="py-2.5 pr-4">
                        <span className="text-sm font-medium text-navy-700">{den.label}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <input
                          type="number"
                          min={0}
                          value={cantidades[den.value] || ''}
                          onChange={(e) => handleChange(den.value, e.target.value)}
                          className="w-28 input-field py-1.5"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2.5 text-right text-sm text-navy-500">
                        {sub > 0 ? formatCurrency(sub) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumen */}
          <div className="w-56 shrink-0">
            <div className="bg-navy-50 rounded-[12px] p-5 sticky top-4">
              <p className="text-sm text-navy-400 mb-1">Monto de Apertura</p>
              <p className="text-3xl font-bold text-primary-600 font-display mb-4">
                {formatCurrency(montoTotal)}
              </p>

              <div className="mb-4">
                <p className="text-xs text-navy-400 mb-1">Caja activa</p>
                <div className="bg-gradient-to-br from-primary-600 to-primary-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg text-center">
                  {cajaNombre}
                </div>
              </div>

              {/* Desglose rápido */}
              <div className="space-y-1 border-t border-navy-200 pt-3 mb-4">
                {DENOMINACIONES.filter((d) => (cantidades[d.value] || 0) > 0).map((d) => (
                  <div key={d.value} className="flex justify-between text-xs text-navy-400">
                    <span>{d.label} × {cantidades[d.value]}</span>
                    <span>{formatCurrency((cantidades[d.value] || 0) * Number(d.value))}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAbrir}
                disabled={abrir.isPending || montoTotal === 0}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {abrir.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {abrir.isPending ? 'Abriendo...' : 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

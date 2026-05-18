'use client';

import { useState } from 'react';
import { useDgii607Preview, useDgii606Preview } from '@/hooks/useReportes';
import { reportesService } from '@/services/reportes.service';
import { formatCurrency } from '@/lib/utils';
import { FileText, Download, Loader2, AlertTriangle } from 'lucide-react';
import {
  downloadCSV, BarChartSimple, StatCard, LoadingCard, QueryError,
} from '@/components/reportes/reportes-shared';

// ── Tab: DGII ─────────────────────────────────────────────────────────────────

function DgiiPreviewAlerts({ alertas }: { alertas: string[] }) {
  if (!alertas.length) {
    return <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Sin alertas para este período.</p>;
  }
  return (
    <ul className="text-xs text-amber-900 bg-amber-50 px-3 py-2 rounded-lg space-y-1 list-none">
      {alertas.map((a, i) => (
        <li key={i} className="flex gap-1.5 items-start">
          <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
          <span>{a}</span>
        </li>
      ))}
    </ul>
  );
}

export function TabDGII() {
  const now = new Date();
  const defaultPeriodo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [periodo, setPeriodo] = useState(defaultPeriodo);
  const [loading607, setLoading607] = useState(false);
  const [loading606, setLoading606] = useState(false);
  const [error607, setError607] = useState('');
  const [error606, setError606] = useState('');
  const { data: preview607, isLoading: loadingPreview607 } = useDgii607Preview(periodo);
  const { data: preview606, isLoading: loadingPreview606 } = useDgii606Preview(periodo);

  const handleDescargar607 = async () => {
    setLoading607(true); setError607('');
    try { await reportesService.dgii607(periodo); }
    catch { setError607('Error al generar el archivo 607'); }
    finally { setLoading607(false); }
  };

  const handleDescargar606 = async () => {
    setLoading606(true); setError606('');
    try { await reportesService.dgii606(periodo); }
    catch { setError606('Error al generar el archivo 606'); }
    finally { setLoading606(false); }
  };

  const periodoLabel = (() => {
    if (!/^\d{6}$/.test(periodo)) return '';
    const y = parseInt(periodo.substring(0, 4));
    const m = parseInt(periodo.substring(4, 6)) - 1;
    return new Date(y, m, 1).toLocaleString('es-DO', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="space-y-5">
      {/* Selector de período */}
      <div className="bg-white rounded-[12px] shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-primary-500" />
          <h3 className="font-semibold text-navy-800">Formularios DGII</h3>
          <span className="text-xs text-navy-400 ml-1">República Dominicana</span>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-xs font-medium text-navy-600 block mb-1">Período (YYYYMM)</label>
            <input
              type="month"
              value={`${periodo.substring(0, 4)}-${periodo.substring(4, 6)}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-');
                if (y && m) setPeriodo(`${y}${m}`);
              }}
              className="input-field w-44"
            />
          </div>
          {periodoLabel && (
            <p className="text-sm text-navy-500 mb-2 capitalize">{periodoLabel}</p>
          )}
        </div>
      </div>

      {/* Tarjetas de descarga */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 607 Ventas */}
        <div className="bg-white rounded-[12px] shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-emerald-600" />
            </div>
            <div>
              <h4 className="font-bold text-navy-800">Formato 607</h4>
              <p className="text-sm text-navy-500">Registro de Ventas de Bienes y Servicios</p>
              <p className="text-xs text-navy-400 mt-1">
                Incluye todas las ventas del período con NCF, ITBIS y método de pago.
              </p>
            </div>
          </div>
          {loadingPreview607 ? (
            <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-navy-400" /></div>
          ) : preview607 && (
            <div className="text-xs space-y-2 border border-navy-100 rounded-lg p-3 bg-navy-50/60">
              <p className="text-navy-700">
                <span className="font-semibold">{preview607.lineas}</span> líneas ·{' '}
                {formatCurrency(preview607.totalVentas)}
              </p>
              <p className="text-navy-500">ITBIS estimado (18% incluido): {formatCurrency(preview607.itbisEstimado)}</p>
              {(preview607.sinNcf > 0 || preview607.clienteSinIdentificacion > 0) && (
                <p className="text-rose-600">
                  {preview607.sinNcf > 0 && `${preview607.sinNcf} sin NCF`}
                  {preview607.sinNcf > 0 && preview607.clienteSinIdentificacion > 0 && ' · '}
                  {preview607.clienteSinIdentificacion > 0 && `${preview607.clienteSinIdentificacion} cliente sin ID`}
                </p>
              )}
              <DgiiPreviewAlerts alertas={preview607.alertas} />
            </div>
          )}
          {error607 && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error607}</p>}
          <button
            onClick={handleDescargar607}
            disabled={loading607 || !/^\d{6}$/.test(periodo)}
            className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading607
              ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
              : <><Download size={14} /> Descargar 607-{periodo}.txt</>
            }
          </button>
        </div>

        {/* 606 Compras */}
        <div className="bg-white rounded-[12px] shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-navy-800">Formato 606</h4>
              <p className="text-sm text-navy-500">Registro de Compras de Bienes y Servicios</p>
              <p className="text-xs text-navy-400 mt-1">
                Incluye órdenes de compra recibidas y gastos del período con ITBIS calculado.
              </p>
            </div>
          </div>
          {loadingPreview606 ? (
            <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-navy-400" /></div>
          ) : preview606 && (
            <div className="text-xs space-y-2 border border-navy-100 rounded-lg p-3 bg-navy-50/60">
              <p className="text-navy-700">
                <span className="font-semibold">{preview606.lineas}</span> líneas
                ({preview606.lineasOrdenes} compras + {preview606.lineasGastos} gastos) ·{' '}
                {formatCurrency(preview606.totalCompras)}
              </p>
              <p className="text-navy-500">ITBIS estimado: {formatCurrency(preview606.itbisEstimado)}</p>
              {preview606.ordenSinRncProveedor > 0 && (
                <p className="text-rose-600">{preview606.ordenSinRncProveedor} orden(es) sin RNC de proveedor</p>
              )}
              <DgiiPreviewAlerts alertas={preview606.alertas} />
            </div>
          )}
          {error606 && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error606}</p>}
          <button
            onClick={handleDescargar606}
            disabled={loading606 || !/^\d{6}$/.test(periodo)}
            className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading606
              ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
              : <><Download size={14} /> Descargar 606-{periodo}.txt</>
            }
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-navy-50 rounded-[12px] p-4 text-xs text-navy-500 space-y-1">
        <p className="font-semibold text-navy-700">Notas</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Los archivos se generan en formato de texto plano separado por pipes (|), listo para cargar en DGII.</li>
          <li>El ITBIS se calcula como el 18% incluido en el precio: base = total ÷ 1.18, ITBIS = total − base.</li>
          <li>Ventas anuladas quedan excluidas del 607.</li>
          <li>El RNC de la empresa se toma de la configuración del sistema.</li>
        </ul>
      </div>
    </div>
  );
}


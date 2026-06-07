'use client';

import { useState } from 'react';
import { useComprobantes, useCrearComprobante, useActualizarComprobante } from '@/hooks/useComprobantes';
import { PageHeader } from '@/components/layout/PageHeader';
import { IComprobante } from '@pos/shared';
import { Plus, FileText, Pencil, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { Select } from '@/components/ui/Select';
import { buildNcfPreview, ncfProgressPct, ncfSequenceExhausted, parseNcfSequenceTail } from '@/lib/ncf';

const TIPOS_NCF = [
  { id: '01', label: 'B01 — Crédito Fiscal' },
  { id: '02', label: 'B02 — Consumidor Final' },
  { id: '04', label: 'B04 — Nota de Crédito' },
  { id: '14', label: 'B14 — Régimen Especial' },
  { id: '15', label: 'B15 — Gubernamental' },
];

const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS_NCF.map((t) => [t.id, t.label]));

interface FormState {
  descripcion:     string;
  series:          string;
  tipo:            string;
  desde:           string;
  hasta:           string;
  secuenciaActual: string;
}

const EMPTY_FORM: FormState = {
  descripcion:     '',
  series:          'B',
  tipo:            '02',
  desde:           '',
  hasta:           '',
  secuenciaActual: '',
};

function ComprobanteModal({
  comprobante,
  onClose,
}: {
  comprobante: IComprobante | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    comprobante
      ? {
          descripcion:     comprobante.descripcion,
          series:          comprobante.series,
          tipo:            comprobante.tipo,
          desde:           comprobante.desde,
          hasta:           comprobante.hasta,
          secuenciaActual: comprobante.secuenciaActual,
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const crear    = useCrearComprobante();
  const actualizar = useActualizarComprobante();
  const isPending = crear.isPending || actualizar.isPending;

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.descripcion.trim()) { setError('La descripción es obligatoria'); return; }
    if (!form.desde || !form.hasta) { setError('Ingresa el rango de secuencias'); return; }
    if (!form.secuenciaActual) { setError('Ingresa la secuencia actual'); return; }
    try {
      setError('');
      if (comprobante) {
        await actualizar.mutateAsync({ id: comprobante.id, payload: form });
      } else {
        await crear.mutateAsync(form);
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40">
          <h3 className="font-semibold text-navy-800">
            {comprobante ? 'Editar Comprobante' : 'Nuevo Comprobante NCF'}
          </h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Descripción</label>
            <input className="input-field" value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Ej: Comprobantes B02 2024" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Tipo de comprobante</label>
              <Select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS_NCF.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Serie</label>
              <input className="input-field font-mono" value={form.series}
                onChange={(e) => set('series', e.target.value.toUpperCase())}
                maxLength={3} placeholder="B" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Desde (secuencia)</label>
              <input className="input-field font-mono" value={form.desde}
                onChange={(e) => set('desde', e.target.value)}
                placeholder="00000001" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Hasta (secuencia)</label>
              <input className="input-field font-mono" value={form.hasta}
                onChange={(e) => set('hasta', e.target.value)}
                placeholder="00000500" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Secuencia actual</label>
            <input className="input-field font-mono" value={form.secuenciaActual}
              onChange={(e) => set('secuenciaActual', e.target.value)}
              placeholder="00000001 o B0200000001" />
            <p className="text-xs text-navy-400 mt-1">
              El próximo comprobante usará este número (debe estar dentro del rango autorizado).
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {isPending ? 'Guardando...' : comprobante ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function progreso(actual: string, desde: string, hasta: string): number {
  return ncfProgressPct(actual, desde, hasta);
}

export default function ComprobantePage() {
  const { data: comprobantes = [], isLoading } = useComprobantes();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<IComprobante | null>(null);

  const handleEditar = (c: IComprobante) => { setSelected(c); setModalOpen(true); };
  const handleNuevo  = ()              => { setSelected(null); setModalOpen(true); };

  const pageTitle = 'Comprobantes Fiscales (NCF)';

  return (
    <>
      <main aria-labelledby="comprobante-heading" className="space-y-5">
        <h1 id="comprobante-heading" className="sr-only">
          {pageTitle}
        </h1>
        <PageHeader title={pageTitle} breadcrumb={['Panel', 'Comprobantes']} />

        {/* Alerta informativa */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <strong>Importante:</strong> Los rangos de comprobantes deben ser autorizados por la DGII.
            Ingresa exactamente los números que aparecen en tu autorización.
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-navy-100/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-navy-800 text-sm">Secuencias registradas</span>
              <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {comprobantes.length}
              </span>
            </div>
            <button onClick={handleNuevo} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={14} /> Nuevo rango
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary-400" size={24} />
            </div>
          ) : comprobantes.length === 0 ? (
            <div className="text-center py-16 text-navy-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay comprobantes registrados</p>
              <p className="text-sm mt-1">Agrega los rangos autorizados por la DGII</p>
              <button onClick={handleNuevo} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
                <Plus size={14} /> Agregar primero
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Tipo</th>
                    <th className="table-header">Descripción</th>
                    <th className="table-header text-center">Serie</th>
                    <th className="table-header text-center">Rango</th>
                    <th className="table-header text-center">Actual</th>
                    <th className="table-header">Progreso</th>
                    <th className="table-header text-center">Estado</th>
                    <th className="table-header text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map((c: IComprobante) => {
                    const pct   = progreso(c.secuenciaActual, c.desde, c.hasta);
                    const agotado = ncfSequenceExhausted(c.secuenciaActual, c.hasta);
                    const proximo = buildNcfPreview(c.series, c.tipo, parseNcfSequenceTail(c.secuenciaActual));
                    const pocoStock = pct > 85;
                    return (
                      <tr key={c.id} className="table-row-hover">
                        <td className="table-cell">
                          <span className="badge-orange font-mono text-xs">B{c.tipo}</span>
                        </td>
                        <td className="table-cell text-navy-700 font-medium text-sm">{c.descripcion}</td>
                        <td className="table-cell text-center font-mono text-navy-600">{c.series}</td>
                        <td className="table-cell text-center">
                          <span className="font-mono text-xs text-navy-500">
                            {c.desde} — {c.hasta}
                          </span>
                        </td>
                        <td className="table-cell text-center font-mono font-semibold text-navy-800">
                          <span className="block">{c.secuenciaActual}</span>
                          <span className="text-[10px] font-normal text-navy-500">Próximo: {proximo}</span>
                        </td>
                        <td className="table-cell min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-navy-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  agotado ? 'bg-rose-500' : pocoStock ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-navy-400 shrink-0">{Math.round(pct)}%</span>
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          {agotado
                            ? <span className="badge-red">Agotado</span>
                            : pocoStock
                            ? <span className="badge-orange">Bajo</span>
                            : <span className="badge-green">Activo</span>}
                        </td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => handleEditar(c)}
                            title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors ml-auto"
                          >
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leyenda tipos */}
        <div className="bg-white rounded-[12px] shadow-card p-4">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">Tipos de comprobante</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {TIPOS_NCF.map((t) => (
              <div key={t.id} className="bg-navy-50 rounded-lg px-3 py-2">
                <span className="text-xs font-mono font-bold text-primary-600">B{t.id}</span>
                <p className="text-xs text-navy-600 mt-0.5 leading-tight">{t.label.split('—')[1]?.trim()}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {modalOpen && (
        <ComprobanteModal
          comprobante={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
        />
      )}
    </>
  );
}

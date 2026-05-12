'use client';

import { useState } from 'react';
import { useGastos, useCrearGasto, useActualizarGasto, useEliminarGasto } from '@/hooks/useGastos';
import { PageHeader } from '@/components/layout/PageHeader';
import { IGasto } from '@pos/shared';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Search, Pencil, Trash2, X, Loader2,
  Receipt, AlertTriangle,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { Select } from '@/components/ui/Select';
import { toast } from '@/store/toast.store';

const CATEGORIAS = [
  'Alquiler', 'Servicios', 'Nómina', 'Compras', 'Transporte',
  'Marketing', 'Mantenimiento', 'Impuestos', 'Otros',
];

interface FormState {
  escribe:           string;
  descripcion:       string;
  categoria:         string;
  fecha:             string;
  cantidad:          string;
  impuesto:          string;
  nombreRecipiente:  string;
}

const EMPTY: FormState = {
  escribe:          '',
  descripcion:      '',
  categoria:        CATEGORIAS[0],
  fecha:            new Date().toISOString().split('T')[0],
  cantidad:         '',
  impuesto:         '0',
  nombreRecipiente: '',
};

function GastoModal({ gasto, onClose }: { gasto: IGasto | null; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(
    gasto ? {
      escribe:          gasto.escribe,
      descripcion:      gasto.descripcion ?? '',
      categoria:        gasto.categoria,
      fecha:            gasto.fecha.split('T')[0],
      cantidad:         String(gasto.cantidad),
      impuesto:         String(gasto.impuesto ?? 0),
      nombreRecipiente: gasto.nombreRecipiente ?? '',
    } : EMPTY
  );
  const [error, setError] = useState('');

  const crear      = useCrearGasto();
  const actualizar = useActualizarGasto();
  const isPending  = crear.isPending || actualizar.isPending;

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.escribe.trim()) { setError('El concepto es obligatorio'); return; }
    if (!form.cantidad || isNaN(Number(form.cantidad)) || Number(form.cantidad) <= 0) {
      setError('Ingresa un monto válido'); return;
    }
    try {
      setError('');
      const payload = {
        escribe:          form.escribe.trim(),
        descripcion:      form.descripcion || undefined,
        categoria:        form.categoria,
        fecha:            form.fecha,
        cantidad:         Number(form.cantidad),
        impuesto:         Number(form.impuesto) || 0,
        nombreRecipiente: form.nombreRecipiente || undefined,
      };
      if (gasto) {
        await actualizar.mutateAsync({ id: gasto.id, payload });
      } else {
        await crear.mutateAsync(payload);
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
          <h3 className="font-semibold text-navy-800">{gasto ? 'Editar gasto' : 'Registrar gasto'}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Concepto *</label>
            <input className="input-field" value={form.escribe}
              onChange={(e) => set('escribe', e.target.value)}
              placeholder="Ej: Pago de alquiler local" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Categoría</label>
              <Select value={form.categoria}
                onChange={(e) => set('categoria', e.target.value)}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Fecha</label>
              <input type="date" className="input-field" value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Monto *</label>
              <input type="number" className="input-field" value={form.cantidad}
                onChange={(e) => set('cantidad', e.target.value)}
                min={0} step={0.01} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">ITBIS incluido</label>
              <input type="number" className="input-field" value={form.impuesto}
                onChange={(e) => set('impuesto', e.target.value)}
                min={0} step={0.01} placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Recipiente / Proveedor</label>
            <input className="input-field" value={form.nombreRecipiente}
              onChange={(e) => set('nombreRecipiente', e.target.value)}
              placeholder="Ej: Claro, Edenorte, Propietario..." />
          </div>
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Descripción (opcional)</label>
            <input className="input-field" value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Notas adicionales..." />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
            {isPending ? 'Guardando...' : gasto ? 'Actualizar' : 'Registrar'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function GastosPage() {
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [q, setQ]                 = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<IGasto | null>(null);

  const { data, isLoading } = useGastos(page, 20, q);
  const eliminar            = useEliminarGasto();

  const gastos     = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPagina = gastos.reduce((s, g) => s + Number(g.cantidad), 0);

  const handleEditar  = (g: IGasto) => { setSelected(g); setModalOpen(true); };
  const handleNuevo   = ()          => { setSelected(null); setModalOpen(true); };

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const handleEliminar = (id: number) => setConfirmId(id);
  const confirmarEliminar = async () => {
    if (!confirmId) return;
    try { await eliminar.mutateAsync(confirmId); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar'); }
    finally { setConfirmId(null); }
  };

  return (
    <>
      <main aria-labelledby="gastos-heading">
        <div className="space-y-4">
          <h1 id="gastos-heading" className="sr-only">
            Gastos
          </h1>
          <PageHeader title="Gastos" breadcrumb={['Panel', 'Gastos']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input className="input-field pl-9" placeholder="Buscar concepto..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setQ(search); setPage(1); } }} />
            </div>
            <button onClick={() => { setQ(search); setPage(1); }} className="btn-outline">Buscar</button>
            {q && (
              <button onClick={() => { setSearch(''); setQ(''); setPage(1); }}
                className="btn-ghost text-navy-400 text-sm">Limpiar</button>
            )}
            <button onClick={handleNuevo} className="btn-primary flex items-center gap-2 ml-auto">
              <Plus size={15} /> Nuevo Gasto
            </button>
          </div>

          {/* Count bar */}
          <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-700">Egresos</span>
              <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {pagination?.total ?? 0}
              </span>
            </div>
            {gastos.length > 0 && (
              <span className="text-sm text-navy-500">
                Total página: <strong className="text-rose-600">{formatCurrency(totalPagina)}</strong>
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Concepto</th>
                  <th className="table-header">Categoría</th>
                  <th className="table-header hidden md:table-cell">Recipiente</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header text-right">Monto</th>
                  <th className="table-header hidden lg:table-cell text-right">ITBIS</th>
                  <th className="table-header text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-navy-400 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Cargando...
                    </div>
                  </td></tr>
                ) : gastos.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-navy-400">
                    <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay gastos registrados{q ? ` para "${q}"` : ''}</p>
                  </td></tr>
                ) : (
                  gastos.map((g: IGasto) => (
                    <tr key={g.id} className="table-row-hover">
                      <td className="table-cell">
                        <p className="font-medium text-navy-800">{g.escribe}</p>
                        {g.descripcion && <p className="text-xs text-navy-400 mt-0.5">{g.descripcion}</p>}
                      </td>
                      <td className="table-cell">
                        <span className="badge-gray">{g.categoria}</span>
                      </td>
                      <td className="table-cell hidden md:table-cell text-navy-500 text-sm">
                        {g.nombreRecipiente ?? '—'}
                      </td>
                      <td className="table-cell text-navy-500 text-sm">
                        {new Date(g.fecha).toLocaleDateString('es-DO')}
                      </td>
                      <td className="table-cell text-right font-bold text-rose-600">
                        {formatCurrency(Number(g.cantidad))}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-right text-navy-500 text-sm">
                        {Number(g.impuesto) > 0 ? formatCurrency(Number(g.impuesto)) : '—'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => handleEditar(g)} title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleEliminar(g.id)}
                            disabled={eliminar.isPending} title="Eliminar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5 p-4 justify-center border-t border-navy-100/40">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg bg-navy-100 text-navy-600 hover:bg-navy-200 disabled:opacity-40 font-medium">
                ← Ant
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg font-semibold ${
                    p === page ? 'bg-primary-600 text-white shadow-sm' : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                  }`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 text-xs rounded-lg bg-navy-100 text-navy-600 hover:bg-navy-200 disabled:opacity-40 font-medium">
                Sig →
              </button>
            </div>
          )}
        </div>
        </div>
      </main>

      {modalOpen && (
        <GastoModal
          gasto={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
        />
      )}

      {confirmId !== null && (
        <ModalOverlay onClose={() => setConfirmId(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <h3 className="font-semibold text-navy-800 mb-1">Eliminar gasto</h3>
            <p className="text-sm text-navy-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setConfirmId(null)} className="btn-outline">Cancelar</button>
              <button onClick={confirmarEliminar} disabled={eliminar.isPending}
                className="btn-danger flex items-center gap-2">
                {eliminar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

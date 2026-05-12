'use client';

import { useMemo, useState } from 'react';
import { useCajas, useCrearCaja, useActualizarCaja, useEliminarCaja } from '@/hooks/useCajas';
import { useTiendas } from '@/hooks/useTiendas';
import { PageHeader } from '@/components/layout/PageHeader';
import { ICaja } from '@pos/shared';
import {
  Plus, Pencil, Trash2, X, Loader2, Landmark, AlertTriangle, Search, Store,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { Select } from '@/components/ui/Select';
import { toast } from '@/store/toast.store';

interface FormState {
  nombre:   string;
  tiendaId: number | '';
  notas:    string;
}

const EMPTY: FormState = { nombre: '', tiendaId: '', notas: '' };

function CajaModal({ caja, onClose }: { caja: ICaja | null; onClose: () => void }) {
  const { data: tiendas = [] } = useTiendas();
  const [form, setForm] = useState<FormState>(
    caja
      ? {
          nombre:   caja.nombre,
          tiendaId: caja.tienda?.id ?? '',
          notas:    caja.notas ?? '',
        }
      : EMPTY
  );
  const [error, setError] = useState('');

  const crear      = useCrearCaja();
  const actualizar = useActualizarCaja();
  const isPending  = crear.isPending || actualizar.isPending;

  const set = (k: keyof FormState, v: string | number | '') =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (form.tiendaId === '') { setError('Selecciona una sucursal'); return; }
    try {
      setError('');
      if (caja) {
        await actualizar.mutateAsync({
          id: caja.id,
          payload: {
            nombre: form.nombre.trim(),
            tiendaId: Number(form.tiendaId),
            notas: form.notas.trim() || undefined,
          },
        });
      } else {
        await crear.mutateAsync({
          nombre:   form.nombre.trim(),
          tiendaId: Number(form.tiendaId),
          notas:    form.notas.trim() || undefined,
        });
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40">
          <h3 className="font-semibold text-navy-800">
            {caja ? 'Editar caja' : 'Nueva caja'}
          </h3>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Sucursal *</label>
            <Select
              value={form.tiendaId === '' ? '' : String(form.tiendaId)}
              onChange={(e) => set('tiendaId', e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Seleccionar…</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Nombre de la caja *</label>
            <input
              className="input-field"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Caja 1, Mostrador"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Notas</label>
            <textarea
              className="input-field resize-none text-sm"
              rows={2}
              value={form.notas}
              onChange={(e) => set('notas', e.target.value)}
              placeholder="Opcional"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40">
          <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
            {isPending ? 'Guardando...' : caja ? 'Actualizar' : 'Crear caja'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function CajasPage() {
  const [search, setSearch]       = useState('');
  const [filtroTienda, setFiltroTienda] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<ICaja | null>(null);

  const { data: tiendas = [] } = useTiendas();
  const { data: cajas = [], isLoading } = useCajas(filtroTienda === '' ? undefined : filtroTienda);
  const eliminar = useEliminarCaja();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cajas;
    return cajas.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.tienda?.nombre ?? '').toLowerCase().includes(q)
    );
  }, [cajas, search]);

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const confirmarEliminar = async () => {
    if (!confirmId) return;
    try {
      await eliminar.mutateAsync(confirmId);
      toast.success('Caja desactivada');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <>
      <main aria-labelledby="cajas-heading" className="space-y-4">
        <h1 id="cajas-heading" className="sr-only">
          Cajas
        </h1>
        <PageHeader title="Cajas" breadcrumb={['Panel', 'Cajas']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                className="input-field pl-9"
                placeholder="Buscar caja o sucursal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              wrapperClassName="w-48 shrink-0"
              value={filtroTienda === '' ? '' : String(filtroTienda)}
              onChange={(e) => setFiltroTienda(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Todas las sucursales</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => { setSelected(null); setModalOpen(true); }}
              className="btn-primary flex items-center gap-2 ml-auto"
            >
              <Plus size={15} /> Nueva caja
            </button>
          </div>

          <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-700">Puntos de venta</span>
            <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {filtered.length}
            </span>
          </div>

          <div className="p-4 overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-navy-400 text-sm py-12">
                <Loader2 size={16} className="animate-spin" /> Cargando...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-navy-400 text-sm py-12">No hay cajas registradas.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-navy-500">
                    <th className="pb-2 pr-4 font-semibold">Caja</th>
                    <th className="pb-2 pr-4 font-semibold">Sucursal</th>
                    <th className="pb-2 pr-4 font-semibold">Estado</th>
                    <th className="pb-2 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-navy-50 hover:bg-navy-50/40">
                      <td className="py-3 pr-4 font-medium text-navy-800">{c.nombre}</td>
                      <td className="py-3 pr-4 text-navy-600 flex items-center gap-1.5">
                        <Store size={14} className="text-navy-400 shrink-0" />
                        {c.tienda?.nombre ?? '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          c.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-navy-100 text-navy-500'
                        }`}>
                          {c.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => { setSelected(c); setModalOpen(true); }}
                          className="p-1.5 text-navy-400 hover:text-primary-600"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(c.id)}
                          className="p-1.5 text-navy-400 hover:text-rose-600"
                          title="Desactivar"
                          disabled={!c.activo}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-4 py-3 bg-navy-50/80 border-t border-navy-100 text-xs text-navy-500">
            Asigna cada caja a una sucursal. En <strong>Configuración</strong>, Nexo usa la caja elegida para abrir sesión y cuadrar ventas y gastos.
          </div>
        </div>
      </main>

      {modalOpen && (
        <CajaModal
          caja={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
        />
      )}

      {confirmId != null && (
        <ModalOverlay onClose={() => setConfirmId(null)}>
          <div className="bg-white rounded-[12px] shadow-float p-6 max-w-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0" size={22} />
              <div>
                <p className="font-semibold text-navy-800">¿Desactivar esta caja?</p>
                <p className="text-sm text-navy-500 mt-1">No podrás abrir sesión en ella hasta que la reactives.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn-outline" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmarEliminar}
                disabled={eliminar.isPending}
              >
                {eliminar.isPending ? '…' : 'Desactivar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { useKits, useCrearKit, useActualizarKit, useEliminarKit } from '@/hooks/useKits';
import { useArticulos } from '@/hooks/useInventario';
import { PageHeader } from '@/components/layout/PageHeader';
import { IKit, IArticulo } from '@pos/shared';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Pencil, Trash2, X, Loader2,
  Box, AlertTriangle, Search, Package, ChevronDown,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { toast } from '@/store/toast.store';

interface LineaKit {
  articuloId: number;
  nombre:     string;
  cantidad:   number;
}

interface FormState {
  nombre:      string;
  precio:      string;
  descripcion: string;
  lineas:      LineaKit[];
}

const EMPTY: FormState = { nombre: '', precio: '', descripcion: '', lineas: [] };

function KitModal({
  kit,
  onClose,
}: {
  kit:     IKit | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    kit ? {
      nombre:      kit.nombre,
      precio:      String(kit.precio),
      descripcion: kit.descripcion ?? '',
      lineas:      kit.detalles.map((d) => ({
        articuloId: d.articulo.id,
        nombre:     d.articulo.nombre,
        cantidad:   d.cantidad,
      })),
    } : EMPTY
  );
  const [error,      setError]      = useState('');
  const [artSearch,  setArtSearch]  = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const { data: artData } = useArticulos(1, 50, artSearch);
  const articulos = artData?.data ?? [];

  const crear      = useCrearKit();
  const actualizar = useActualizarKit();
  const isPending  = crear.isPending || actualizar.isPending;

  const setField = (k: keyof Omit<FormState, 'lineas'>, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addArticulo = (art: IArticulo) => {
    if (form.lineas.some((l) => l.articuloId === art.id)) return;
    setForm((p) => ({
      ...p,
      lineas: [...p.lineas, { articuloId: art.id, nombre: art.nombre, cantidad: 1 }],
    }));
    setArtSearch('');
    setShowPicker(false);
  };

  const removeLinea = (idx: number) =>
    setForm((p) => ({ ...p, lineas: p.lineas.filter((_, i) => i !== idx) }));

  const setCantidad = (idx: number, val: number) =>
    setForm((p) => ({
      ...p,
      lineas: p.lineas.map((l, i) => i === idx ? { ...l, cantidad: Math.max(1, val) } : l),
    }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.precio || isNaN(Number(form.precio)) || Number(form.precio) <= 0) {
      setError('Ingresa un precio válido'); return;
    }
    if (form.lineas.length === 0) { setError('Agrega al menos un artículo al kit'); return; }
    try {
      setError('');
      const payload = {
        nombre:      form.nombre.trim(),
        precio:      Number(form.precio),
        descripcion: form.descripcion || undefined,
        detalles:    form.lineas.map((l) => ({ articuloId: l.articuloId, cantidad: l.cantidad })),
      };
      if (kit) {
        await actualizar.mutateAsync({ id: kit.id, payload });
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
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40 flex-shrink-0">
          <h3 className="font-semibold text-navy-800">
            {kit ? 'Editar kit' : 'Nuevo kit'}
          </h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Nombre y precio */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Nombre *</label>
              <input className="input-field" value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                placeholder="Ej: Kit Desayuno Completo" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Precio venta *</label>
              <input type="number" className="input-field" value={form.precio}
                onChange={(e) => setField('precio', e.target.value)}
                min={0} step={0.01} placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Descripción</label>
            <input className="input-field" value={form.descripcion}
              onChange={(e) => setField('descripcion', e.target.value)}
              placeholder="Descripción opcional..." />
          </div>

          {/* Artículos del kit */}
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-2">
              Artículos del kit *
            </label>

            {/* Lista de líneas */}
            {form.lineas.length > 0 && (
              <div className="border border-navy-100 rounded-lg divide-y divide-navy-50 mb-2">
                {form.lineas.map((l, idx) => (
                  <div key={l.articuloId} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Package size={12} className="text-primary-600" />
                    </div>
                    <span className="flex-1 text-sm text-navy-700 truncate">{l.nombre}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCantidad(idx, l.cantidad - 1)}
                        className="w-6 h-6 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-sm font-bold flex items-center justify-center">
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-navy-700">{l.cantidad}</span>
                      <button
                        onClick={() => setCantidad(idx, l.cantidad + 1)}
                        className="w-6 h-6 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-sm font-bold flex items-center justify-center">
                        +
                      </button>
                    </div>
                    <button onClick={() => removeLinea(idx)}
                      className="w-6 h-6 flex items-center justify-center rounded text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Buscador de artículos */}
            <div className="relative">
              <div
                className="input-field flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setShowPicker(!showPicker)}>
                <Search size={13} className="text-navy-400" />
                <input
                  className="flex-1 outline-none text-sm bg-transparent placeholder-navy-400"
                  placeholder="Buscar artículo para agregar..."
                  value={artSearch}
                  onChange={(e) => { setArtSearch(e.target.value); setShowPicker(true); }}
                  onClick={(e) => e.stopPropagation()}
                />
                <ChevronDown size={13} className="text-navy-400" />
              </div>

              {showPicker && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-navy-100 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {articulos.length === 0 ? (
                    <p className="text-sm text-navy-400 px-3 py-4 text-center">
                      {artSearch ? 'Sin resultados' : 'Escribe para buscar...'}
                    </p>
                  ) : (
                    articulos
                      .filter((a) => !form.lineas.some((l) => l.articuloId === a.id))
                      .map((a: IArticulo) => (
                        <button key={a.id} onClick={() => addArticulo(a)}
                          className="w-full text-left px-3 py-2.5 hover:bg-navy-50 flex items-center gap-2.5 transition-colors">
                          <Package size={13} className="text-primary-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-navy-700">{a.nombre}</p>
                            <p className="text-xs text-navy-400">
                              Stock: {a.cantidad ?? '∞'} · {formatCurrency(a.precioVenta)}
                            </p>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40 flex-shrink-0">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Box size={14} />}
            {isPending ? 'Guardando...' : kit ? 'Actualizar' : 'Crear kit'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function KitsPage() {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<IKit | null>(null);

  const { data: kits = [], isLoading } = useKits();
  const eliminar = useEliminarKit();

  const filtered = kits.filter((k) =>
    k.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (k.descripcion ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEditar  = (k: IKit) => { setSelected(k); setModalOpen(true); };
  const handleNuevo   = ()        => { setSelected(null); setModalOpen(true); };

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
      <div className="space-y-4">
        <PageHeader title="Kits de productos" breadcrumb={['Panel', 'Kits']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input className="input-field pl-9" placeholder="Buscar kit..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search && (
              <button onClick={() => setSearch('')}
                className="btn-ghost text-navy-400 text-sm">Limpiar</button>
            )}
            <button onClick={handleNuevo} className="btn-primary flex items-center gap-2 ml-auto">
              <Plus size={15} /> Nuevo Kit
            </button>
          </div>

          {/* Count bar */}
          <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-700">Kits</span>
            <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {filtered.length}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Kit</th>
                  <th className="table-header text-center">Artículos</th>
                  <th className="table-header text-right">Precio</th>
                  <th className="table-header text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-navy-400 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Cargando...
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-navy-400">
                    <Box size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {search ? `No hay kits para "${search}"` : 'No hay kits registrados'}
                    </p>
                  </td></tr>
                ) : (
                  filtered.map((k: IKit) => (
                    <tr key={k.id} className="table-row-hover">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                            <Box size={15} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-navy-800">{k.nombre}</p>
                            {k.descripcion && (
                              <p className="text-xs text-navy-400 mt-0.5">{k.descripcion}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-navy-700">{k.detalles.length}</span>
                          <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
                            {k.detalles.slice(0, 3).map((d) => (
                              <span key={d.id} className="text-xs bg-navy-50 text-navy-500 px-1.5 py-0.5 rounded">
                                {d.cantidad}x {d.articulo.nombre.substring(0, 12)}{d.articulo.nombre.length > 12 ? '…' : ''}
                              </span>
                            ))}
                            {k.detalles.length > 3 && (
                              <span className="text-xs text-navy-400">+{k.detalles.length - 3} más</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-right font-bold text-emerald-600">
                        {formatCurrency(Number(k.precio))}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => handleEditar(k)} title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleEliminar(k.id)}
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
        </div>
      </div>

      {modalOpen && (
        <KitModal
          kit={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
        />
      )}

      {confirmId !== null && (
        <ModalOverlay onClose={() => setConfirmId(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <h3 className="font-semibold text-navy-800 mb-1">Eliminar kit</h3>
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

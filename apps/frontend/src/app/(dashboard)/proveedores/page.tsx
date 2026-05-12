'use client';

import { useState } from 'react';
import { useProveedores, useCrearProveedor, useActualizarProveedor, useEliminarProveedor } from '@/hooks/useProveedores';
import { PageHeader } from '@/components/layout/PageHeader';
import { IProveedor } from '@pos/shared';
import {
  Plus, Pencil, Trash2, X, Loader2,
  Truck, AlertTriangle, Phone, Mail, MapPin, Building2, Search,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { toast } from '@/store/toast.store';

interface FormState {
  nombre:     string;
  contacto:   string;
  telefono:   string;
  correo:     string;
  direccion:  string;
  rnc:        string;
}

const EMPTY: FormState = {
  nombre:    '',
  contacto:  '',
  telefono:  '',
  correo:    '',
  direccion: '',
  rnc:       '',
};

function ProveedorModal({ proveedor, onClose }: { proveedor: IProveedor | null; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(
    proveedor ? {
      nombre:    proveedor.nombre,
      contacto:  proveedor.contacto  ?? '',
      telefono:  proveedor.telefono  ?? '',
      correo:    proveedor.correo    ?? '',
      direccion: proveedor.direccion ?? '',
      rnc:       proveedor.rnc       ?? '',
    } : EMPTY
  );
  const [error, setError] = useState('');

  const crear      = useCrearProveedor();
  const actualizar = useActualizarProveedor();
  const isPending  = crear.isPending || actualizar.isPending;

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    try {
      setError('');
      const payload = {
        nombre:    form.nombre.trim(),
        contacto:  form.contacto  || undefined,
        telefono:  form.telefono  || undefined,
        correo:    form.correo    || undefined,
        direccion: form.direccion || undefined,
        rnc:       form.rnc       || undefined,
      };
      if (proveedor) {
        await actualizar.mutateAsync({ id: proveedor.id, payload });
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
          <h3 className="font-semibold text-navy-800">
            {proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Nombre *</label>
            <input className="input-field" value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Nombre del proveedor o empresa" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Contacto</label>
              <input className="input-field" value={form.contacto}
                onChange={(e) => set('contacto', e.target.value)}
                placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">RNC</label>
              <input className="input-field" value={form.rnc}
                onChange={(e) => set('rnc', e.target.value)}
                placeholder="RNC / Cédula" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Teléfono</label>
              <input className="input-field" value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                placeholder="809-000-0000" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Correo</label>
              <input type="email" className="input-field" value={form.correo}
                onChange={(e) => set('correo', e.target.value)}
                placeholder="correo@ejemplo.com" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Dirección</label>
            <input className="input-field" value={form.direccion}
              onChange={(e) => set('direccion', e.target.value)}
              placeholder="Calle, sector, ciudad..." />
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
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
            {isPending ? 'Guardando...' : proveedor ? 'Actualizar' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function ProveedoresPage() {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<IProveedor | null>(null);

  const { data: proveedores = [], isLoading } = useProveedores();
  const eliminar = useEliminarProveedor();

  const filtered = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.contacto ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.rnc ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEditar  = (p: IProveedor) => { setSelected(p); setModalOpen(true); };
  const handleNuevo   = ()              => { setSelected(null); setModalOpen(true); };

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
      <main aria-labelledby="proveedores-heading">
        <h1 id="proveedores-heading" className="sr-only">
          Proveedores
        </h1>
        <div className="space-y-4">
        <PageHeader title="Proveedores" breadcrumb={['Panel', 'Proveedores']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input className="input-field pl-9" placeholder="Buscar por nombre, contacto, RNC..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search && (
              <button onClick={() => setSearch('')}
                className="btn-ghost text-navy-400 text-sm">Limpiar</button>
            )}
            <button onClick={handleNuevo} className="btn-primary flex items-center gap-2 ml-auto">
              <Plus size={15} /> Nuevo Proveedor
            </button>
          </div>

          {/* Count bar */}
          <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-700">Proveedores</span>
            <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {filtered.length}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Proveedor</th>
                  <th className="table-header hidden md:table-cell">Contacto</th>
                  <th className="table-header hidden md:table-cell">Teléfono</th>
                  <th className="table-header hidden lg:table-cell">Correo</th>
                  <th className="table-header hidden lg:table-cell">RNC</th>
                  <th className="table-header text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-navy-400 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Cargando...
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-navy-400">
                    <Truck size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {search ? `No hay proveedores para "${search}"` : 'No hay proveedores registrados'}
                    </p>
                  </td></tr>
                ) : (
                  filtered.map((p: IProveedor) => (
                    <tr key={p.id} className="table-row-hover">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <Building2 size={15} className="text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-navy-800">{p.nombre}</p>
                            {p.direccion && (
                              <p className="text-xs text-navy-400 flex items-center gap-1 mt-0.5">
                                <MapPin size={10} /> {p.direccion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell text-navy-500 text-sm">
                        {p.contacto ?? '—'}
                      </td>
                      <td className="table-cell hidden md:table-cell text-sm">
                        {p.telefono ? (
                          <a href={`tel:${p.telefono}`} className="flex items-center gap-1 text-primary-600 hover:underline">
                            <Phone size={12} /> {p.telefono}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-sm">
                        {p.correo ? (
                          <a href={`mailto:${p.correo}`} className="flex items-center gap-1 text-primary-600 hover:underline">
                            <Mail size={12} /> {p.correo}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-navy-500 text-sm font-mono">
                        {p.rnc ?? '—'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => handleEditar(p)} title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleEliminar(p.id)}
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
      </main>

      {modalOpen && (
        <ProveedorModal
          proveedor={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
        />
      )}

      {confirmId !== null && (
        <ModalOverlay onClose={() => setConfirmId(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <h3 className="font-semibold text-navy-800 mb-1">Eliminar proveedor</h3>
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

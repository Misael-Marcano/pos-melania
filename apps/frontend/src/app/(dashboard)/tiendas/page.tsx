'use client';

import { useState } from 'react';
import { useTiendas, useCrearTienda, useActualizarTienda, useEliminarTienda } from '@/hooks/useTiendas';
import { PageHeader } from '@/components/layout/PageHeader';
import { ITienda } from '@pos/shared';
import {
  Plus, Pencil, Trash2, X, Loader2,
  Store, AlertTriangle, Phone, Mail, MapPin, Search,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { toast } from '@/store/toast.store';

interface FormState {
  nombre:    string;
  direccion: string;
  telefono:  string;
  email:     string;
}

const EMPTY: FormState = { nombre: '', direccion: '', telefono: '', email: '' };

function TiendaModal({ tienda, onClose }: { tienda: ITienda | null; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(
    tienda ? {
      nombre:    tienda.nombre,
      direccion: tienda.direccion ?? '',
      telefono:  tienda.telefono  ?? '',
      email:     tienda.email     ?? '',
    } : EMPTY
  );
  const [error, setError] = useState('');

  const crear      = useCrearTienda();
  const actualizar = useActualizarTienda();
  const isPending  = crear.isPending || actualizar.isPending;

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    try {
      setError('');
      const payload = {
        nombre:    form.nombre.trim(),
        direccion: form.direccion || undefined,
        telefono:  form.telefono  || undefined,
        email:     form.email     || undefined,
      };
      if (tienda) {
        await actualizar.mutateAsync({ id: tienda.id, payload });
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
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40">
          <h3 className="font-semibold text-navy-800">
            {tienda ? 'Editar tienda' : 'Nueva tienda'}
          </h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Nombre *</label>
            <input className="input-field" value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Sucursal Centro" />
          </div>
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Dirección</label>
            <input className="input-field" value={form.direccion}
              onChange={(e) => set('direccion', e.target.value)}
              placeholder="Calle, sector, ciudad..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Teléfono</label>
              <input className="input-field" value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                placeholder="809-000-0000" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Correo</label>
              <input type="email" className="input-field" value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="tienda@ejemplo.com" />
            </div>
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
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Store size={14} />}
            {isPending ? 'Guardando...' : tienda ? 'Actualizar' : 'Crear tienda'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function TiendasPage() {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<ITienda | null>(null);

  const { data: tiendas = [], isLoading } = useTiendas();
  const eliminar = useEliminarTienda();

  const filtered = tiendas.filter((t) =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (t.direccion ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEditar  = (t: ITienda) => { setSelected(t); setModalOpen(true); };
  const handleNuevo   = ()           => { setSelected(null); setModalOpen(true); };

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
      <main aria-labelledby="tiendas-heading" className="space-y-4">
        <h1 id="tiendas-heading" className="sr-only">
          Tiendas / Sucursales
        </h1>
        <PageHeader title="Tiendas / Sucursales" breadcrumb={['Panel', 'Tiendas']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input className="input-field pl-9" placeholder="Buscar tienda..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search && (
              <button onClick={() => setSearch('')}
                className="btn-ghost text-navy-400 text-sm">Limpiar</button>
            )}
            <button onClick={handleNuevo} className="btn-primary flex items-center gap-2 ml-auto">
              <Plus size={15} /> Nueva Tienda
            </button>
          </div>

          {/* Count bar */}
          <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-700">Sucursales</span>
            <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {filtered.length}
            </span>
          </div>

          {/* Cards grid */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-navy-400 text-sm py-12">
                <Loader2 size={16} className="animate-spin" /> Cargando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-navy-400">
                <Store size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {search ? `No hay tiendas para "${search}"` : 'No hay tiendas registradas'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t: ITienda) => (
                  <div key={t.id}
                    className="border border-navy-100 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <Store size={17} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-navy-800 text-sm">{t.nombre}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            t.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                          }`}>
                            {t.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <button onClick={() => handleEditar(t)} title="Editar"
                          className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleEliminar(t.id)}
                          disabled={eliminar.isPending} title="Eliminar"
                          className="w-7 h-7 flex items-center justify-center rounded-md text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-navy-500">
                      {t.direccion && (
                        <div className="flex items-start gap-1.5">
                          <MapPin size={11} className="mt-0.5 flex-shrink-0 text-navy-400" />
                          <span>{t.direccion}</span>
                        </div>
                      )}
                      {t.telefono && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="flex-shrink-0 text-navy-400" />
                          <a href={`tel:${t.telefono}`} className="hover:text-primary-600">{t.telefono}</a>
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="flex-shrink-0 text-navy-400" />
                          <a href={`mailto:${t.email}`} className="hover:text-primary-600 truncate">{t.email}</a>
                        </div>
                      )}
                      {!t.direccion && !t.telefono && !t.email && (
                        <p className="text-navy-300 italic">Sin información de contacto</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {modalOpen && (
        <TiendaModal
          tienda={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
        />
      )}

      {confirmId !== null && (
        <ModalOverlay onClose={() => setConfirmId(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <h3 className="font-semibold text-navy-800 mb-1">Eliminar tienda</h3>
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

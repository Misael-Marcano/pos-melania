'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  usePromociones,
  useCrearPromocion,
  useActualizarPromocion,
  useEliminarPromocion,
} from '@/hooks/usePromociones';
import { useAuthStore } from '@/store/auth.store';
import { IPromocion, TipoPromocion } from '@/services/promociones.service';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';

const emptyForm = () => ({
  codigo:       '',
  nombre:       '',
  tipo:         'PORCENTAJE' as TipoPromocion,
  valor:        '',
  montoMinimo:  '0',
  usoMaximo:    '',
  fechaInicio:  '',
  fechaFin:     '',
});

export default function PromocionesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.rol === 'admin';

  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data: lista = [], isLoading } = usePromociones(search || undefined);

  const [editing, setEditing] = useState<IPromocion | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const crear     = useCrearPromocion();
  const actualizar = useActualizarPromocion();
  const eliminar  = useEliminarPromocion();

  const openCreate = () => {
    setForm(emptyForm());
    setCreating(true);
  };

  const openEdit = (p: IPromocion) => {
    setEditing(p);
    setForm({
      codigo:       p.codigo,
      nombre:       p.nombre,
      tipo:         p.tipo,
      valor:        String(p.valor),
      montoMinimo:  String(p.montoMinimo ?? 0),
      usoMaximo:    p.usoMaximo != null ? String(p.usoMaximo) : '',
      fechaInicio:  p.fechaInicio?.split('T')[0] ?? '',
      fechaFin:     p.fechaFin?.split('T')[0] ?? '',
    });
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) return;
    const payload = {
      codigo:       form.codigo.trim(),
      nombre:       form.nombre.trim(),
      tipo:         form.tipo,
      valor:        Number(form.valor),
      montoMinimo:  Number(form.montoMinimo) || 0,
      usoMaximo:    form.usoMaximo ? Number(form.usoMaximo) : undefined,
      fechaInicio:  form.fechaInicio || undefined,
      fechaFin:     form.fechaFin || undefined,
    };
    if (editing) {
      await actualizar.mutateAsync({ id: editing.id, payload: { ...payload, activa: editing.activa } });
    } else {
      await crear.mutateAsync(payload);
    }
    closeModal();
  };

  const toggleActiva = async (p: IPromocion) => {
    await actualizar.mutateAsync({ id: p.id, payload: { activa: !p.activa } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promociones"
        breadcrumb={['Marketing', 'Promociones']}
        actions={
          isAdmin ? (
            <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus size={16} /> Nueva
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            className="input-field pl-9"
            placeholder="Buscar por código o nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(q.trim())}
          />
        </div>
        <button type="button" onClick={() => setSearch(q.trim())} className="btn-outline text-sm">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="table-header text-left">Código</th>
                <th className="table-header text-left">Nombre</th>
                <th className="table-header text-left">Tipo</th>
                <th className="table-header text-right">Valor</th>
                <th className="table-header text-center">Activa</th>
                <th className="table-header text-right">Usos</th>
                {isAdmin && <th className="table-header text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="table-cell text-center py-12 text-navy-400">
                    <Loader2 className="inline animate-spin mr-2" size={18} /> Cargando…
                  </td>
                </tr>
              ) : lista.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="table-cell text-center py-10 text-navy-400">
                    No hay promociones.
                  </td>
                </tr>
              ) : (
                lista.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="table-cell font-mono text-xs">{p.codigo}</td>
                    <td className="table-cell font-medium">{p.nombre}</td>
                    <td className="table-cell text-xs">{p.tipo === 'PORCENTAJE' ? '%' : 'Monto fijo'}</td>
                    <td className="table-cell text-right">
                      {p.tipo === 'PORCENTAJE' ? `${p.valor}%` : formatCurrency(Number(p.valor))}
                    </td>
                    <td className="table-cell text-center">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => toggleActiva(p)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            p.activa ? 'bg-primary-100 text-primary-700' : 'bg-navy-100 text-navy-500'
                          }`}
                        >
                          {p.activa ? 'Sí' : 'No'}
                        </button>
                      ) : (
                        <span className={p.activa ? 'badge-green' : 'badge-gray'}>{p.activa ? 'Sí' : 'No'}</span>
                      )}
                    </td>
                    <td className="table-cell text-right text-xs text-navy-500">
                      {p.usosActuales}
                      {p.usoMaximo != null ? ` / ${p.usoMaximo}` : ''}
                    </td>
                    {isAdmin && (
                      <td className="table-cell text-right space-x-1">
                        <button type="button" className="btn-ghost p-1.5 inline-flex" onClick={() => openEdit(p)}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-1.5 inline-flex text-rose-500"
                          onClick={() => { if (confirm('¿Desactivar esta promoción?')) eliminar.mutate(p.id); }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/50">
              <h3 className="font-semibold text-navy-800">{editing ? 'Editar promoción' : 'Nueva promoción'}</h3>
              <button type="button" onClick={closeModal} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-navy-600">Código *</label>
                <input
                  className="input-field mt-1"
                  value={form.codigo}
                  disabled={!!editing}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">Nombre *</label>
                <input className="input-field mt-1" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-navy-600">Tipo</label>
                  <select
                    className="input-field mt-1"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoPromocion }))}
                  >
                    <option value="PORCENTAJE">Porcentaje</option>
                    <option value="MONTO_FIJO">Monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-600">Valor</label>
                  <input className="input-field mt-1" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-navy-600">Monto mínimo compra</label>
                  <input className="input-field mt-1" value={form.montoMinimo} onChange={(e) => setForm((f) => ({ ...f, montoMinimo: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-600">Uso máximo (opc.)</label>
                  <input className="input-field mt-1" value={form.usoMaximo} onChange={(e) => setForm((f) => ({ ...f, usoMaximo: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-navy-600">Vigencia desde</label>
                  <input type="date" className="input-field mt-1" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-600">Vigencia hasta</label>
                  <input type="date" className="input-field mt-1" value={form.fechaFin} onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-outline text-sm" onClick={closeModal}>Cancelar</button>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  disabled={crear.isPending || actualizar.isPending}
                  onClick={() => handleSave()}
                >
                  {(crear.isPending || actualizar.isPending) ? <Loader2 className="animate-spin" size={16} /> : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

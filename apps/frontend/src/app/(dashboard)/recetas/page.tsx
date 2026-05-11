'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useRecetas,
  useCrearReceta,
  useActualizarReceta,
  useEliminarReceta,
  useProducirReceta,
} from '@/hooks/useRecetas';
import { inventarioService } from '@/services/inventario.service';
import { useAuthStore } from '@/store/auth.store';
import { IArticulo, IReceta } from '@pos/shared';
import { formatCurrency } from '@/lib/utils';
import {
  CreateRecetaPayload,
  IngredienteRecetaPayload,
} from '@/services/recetas.service';
import {
  Loader2, Plus, Pencil, Trash2, Factory, Search, X,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { uiLabels, recetasPageTitle } from '@/lib/ui-labels';

type IngRow = IngredienteRecetaPayload & { nombre?: string };

export default function RecetasPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!uiLabels.featureRecetas) router.replace('/panel');
  }, [router]);
  const canEdit = user?.rol === 'admin' || user?.rol === 'soporte';
  const canProd = user?.rol === 'admin' || user?.rol === 'cajero';

  const { data: recetas = [], isLoading } = useRecetas();
  const crear      = useCrearReceta();
  const actualizar = useActualizarReceta();
  const eliminar   = useEliminarReceta();
  const producir   = useProducirReceta();

  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState<IReceta | null>(null);
  const [prodReceta, setProdReceta] = useState<IReceta | null>(null);
  const [lotes, setLotes]           = useState('1');

  const [nombre, setNombre]                 = useState('');
  const [descripcion, setDescripcion]         = useState('');
  const [articuloResId, setArticuloResId]     = useState<number | null>(null);
  const [articuloResNombre, setArticuloResNombre] = useState('');
  const [cantidadResultado, setCantRes]       = useState('1');
  const [ingredientes, setIngredientes]       = useState<IngRow[]>([]);
  const [qRes, setQRes]                     = useState('');
  const [debRes, setDebRes]                 = useState('');
  const [qIng, setQIng]                     = useState('');
  const [debIng, setDebIng]                 = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebRes(qRes), 300);
    return () => clearTimeout(t);
  }, [qRes]);
  useEffect(() => {
    const t = setTimeout(() => setDebIng(qIng), 300);
    return () => clearTimeout(t);
  }, [qIng]);

  const { data: artsRes } = useQuery({
    queryKey:  ['receta-art', debRes],
    queryFn:   () => inventarioService.getAll(1, 15, debRes),
    enabled:   formOpen && debRes.length >= 1,
  });
  const { data: ingArts } = useQuery({
    queryKey:  ['receta-ing', debIng],
    queryFn:   () => inventarioService.getAll(1, 15, debIng),
    enabled:   formOpen && debIng.length >= 1,
  });

  const artsList = artsRes?.data ?? [];
  const ingList  = ingArts?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setNombre('');
    setDescripcion('');
    setArticuloResId(null);
    setArticuloResNombre('');
    setCantRes('1');
    setIngredientes([]);
    setQRes('');
    setQIng('');
    setFormOpen(true);
  };

  const openEdit = (r: IReceta) => {
    setEditing(r);
    setNombre(r.nombre);
    setDescripcion(r.descripcion ?? '');
    setArticuloResId(r.articuloResultado.id);
    setArticuloResNombre(r.articuloResultado.nombre);
    setCantRes(String(r.cantidadResultado ?? 1));
    setIngredientes(
      r.ingredientes.map((i) => ({
        articuloId: i.articulo.id,
        cantidad:   Number(i.cantidad),
        nombre:     i.articulo.nombre,
      }))
    );
    setFormOpen(true);
  };

  const pickResultado = (a: IArticulo) => {
    setArticuloResId(a.id);
    setArticuloResNombre(a.nombre);
    setQRes('');
  };

  const addIng = (a: IArticulo) => {
    if (ingredientes.some((i) => i.articuloId === a.id)) return;
    setIngredientes((prev) => [...prev, { articuloId: a.id, cantidad: 1, nombre: a.nombre }]);
    setQIng('');
  };

  const saveForm = async () => {
    if (!nombre.trim() || !articuloResId || ingredientes.length === 0) return;
    const payload: CreateRecetaPayload = {
      nombre:              nombre.trim(),
      descripcion:         descripcion.trim() || undefined,
      articuloResultadoId: articuloResId,
      cantidadResultado:   Number(cantidadResultado) > 0 ? Number(cantidadResultado) : 1,
      ingredientes:        ingredientes.map(({ articuloId, cantidad }) => ({
        articuloId,
        cantidad: Number(cantidad) > 0 ? Number(cantidad) : 1,
      })),
    };
    if (editing) {
      await actualizar.mutateAsync({ id: editing.id, payload });
    } else {
      await crear.mutateAsync(payload);
    }
    setFormOpen(false);
  };

  const runProducir = async () => {
    if (!prodReceta) return;
    const n = Math.max(1, parseInt(lotes, 10) || 1);
    await producir.mutateAsync({ id: prodReceta.id, lotes: n });
    setProdReceta(null);
    setLotes('1');
  };

  if (!uiLabels.featureRecetas) {
    return null;
  }

  const rx = uiLabels.receta.toLowerCase();
  const rxs = uiLabels.recetas.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title={recetasPageTitle()}
        breadcrumb={['Inventario', uiLabels.recetas]}
        actions={
          canEdit ? (
            <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus size={16} /> Nueva {rx}
            </button>
          ) : undefined
        }
      />

      <p className="text-sm text-navy-500 max-w-2xl">
        Define listas de materiales (BOM) y registra producción por lotes: se descuentan insumos y aumenta el stock del artículo resultado.
      </p>

      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="table-header text-left">Nombre</th>
                <th className="table-header text-left">Resultado</th>
                <th className="table-header text-right">Por lote</th>
                <th className="table-header text-center">Ingredientes</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center py-12 text-navy-400">
                    <Loader2 className="inline animate-spin mr-2" size={18} /> Cargando…
                  </td>
                </tr>
              ) : recetas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center py-10 text-navy-400">
                    No hay {rxs} activas.
                  </td>
                </tr>
              ) : (
                recetas.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="table-cell font-medium text-navy-800">{r.nombre}</td>
                    <td className="table-cell text-sm">{r.articuloResultado?.nombre ?? '—'}</td>
                    <td className="table-cell text-right text-sm">{Number(r.cantidadResultado).toLocaleString('es-DO')}</td>
                    <td className="table-cell text-center text-sm text-navy-500">{r.ingredientes?.length ?? 0}</td>
                    <td className="table-cell text-right space-x-1 whitespace-nowrap">
                      {canProd && (
                        <button
                          type="button"
                          className="btn-outline text-xs py-1.5 px-2 inline-flex items-center gap-1"
                          onClick={() => setProdReceta(r)}
                        >
                          <Factory size={14} /> Producir
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button type="button" className="btn-ghost p-1.5 inline-flex" onClick={() => openEdit(r)}>
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost p-1.5 inline-flex text-rose-500"
                            onClick={() => { if (confirm(`¿Desactivar esta ${rx}?`)) eliminar.mutate(r.id); }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <ModalOverlay onClose={() => setFormOpen(false)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/50">
              <h3 className="font-semibold text-navy-800 font-display">{editing ? `Editar ${rx}` : `Nueva ${rx}`}</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-navy-400 hover:text-navy-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="text-xs font-medium text-navy-600">Nombre *</label>
                <input className="input-field mt-1" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">Descripción</label>
                <textarea className="input-field mt-1 resize-none min-h-[56px]" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">Artículo resultado *</label>
                {articuloResId ? (
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm">
                    <span className="truncate">{articuloResNombre}</span>
                    <button type="button" className="text-xs text-secondary" onClick={() => { setArticuloResId(null); setArticuloResNombre(''); }}>
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mt-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                      <input className="input-field pl-9" placeholder="Buscar artículo producido…" value={qRes} onChange={(e) => setQRes(e.target.value)} />
                    </div>
                    {artsList.length > 0 && qRes.length >= 1 && (
                      <ul className="mt-1 rounded-lg border border-navy-100/80 max-h-36 overflow-y-auto bg-white shadow-ambient">
                        {artsList.map((a: IArticulo) => (
                          <li key={a.id}>
                            <button type="button" className="w-full text-left px-3 py-2 text-xs hover:bg-navy-50" onClick={() => pickResultado(a)}>
                              {a.nombre}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">Cantidad producida por lote</label>
                <input className="input-field mt-1" value={cantidadResultado} onChange={(e) => setCantRes(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">Ingredientes *</label>
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input className="input-field pl-9" placeholder="Buscar para agregar…" value={qIng} onChange={(e) => setQIng(e.target.value)} />
                </div>
                {ingList.length > 0 && qIng.length >= 1 && (
                  <ul className="mt-1 rounded-lg border border-navy-100/80 max-h-32 overflow-y-auto bg-white shadow-ambient">
                    {ingList.map((a: IArticulo) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-navy-50"
                          onClick={() => addIng(a)}
                          disabled={a.id === articuloResId}
                        >
                          {a.nombre}{a.id === articuloResId ? ' (resultado)' : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 space-y-2">
                  {ingredientes.map((ing, i) => (
                    <div key={`${ing.articuloId}-${i}`} className="flex items-center gap-2 rounded-lg bg-navy-50/80 px-3 py-2">
                      <span className="flex-1 text-xs truncate">{ing.nombre ?? `ID ${ing.articuloId}`}</span>
                      <input
                        className="input-field w-20 py-1.5 text-xs"
                        value={ing.cantidad}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setIngredientes((prev) => prev.map((x, j) => (j === i ? { ...x, cantidad: v } : x)));
                        }}
                      />
                      <button type="button" className="text-rose-500 p-1" onClick={() => setIngredientes((prev) => prev.filter((_, j) => j !== i))}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-outline text-sm" onClick={() => setFormOpen(false)}>Cancelar</button>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  disabled={crear.isPending || actualizar.isPending}
                  onClick={() => saveForm()}
                >
                  {(crear.isPending || actualizar.isPending) ? <Loader2 className="animate-spin" size={16} /> : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {prodReceta && (
        <ModalOverlay onClose={() => setProdReceta(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-5">
            <h3 className="font-semibold text-navy-800 font-display mb-1">Producir: {prodReceta.nombre}</h3>
            <p className="text-xs text-navy-500 mb-4">Lotes de producción (cada lote usa las cantidades de la {rx}).</p>
            <label className="text-xs font-medium text-navy-600">Lotes</label>
            <input className="input-field mt-1 mb-4" value={lotes} onChange={(e) => setLotes(e.target.value)} inputMode="numeric" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-outline text-sm" onClick={() => setProdReceta(null)}>Cancelar</button>
              <button
                type="button"
                className="btn-primary text-sm inline-flex items-center gap-2"
                disabled={producir.isPending}
                onClick={() => runProducir()}
              >
                {producir.isPending ? <Loader2 size={16} className="animate-spin" /> : <Factory size={16} />}
                Confirmar
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

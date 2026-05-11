'use client';

import { useState } from 'react';
import { useArticulos, useClonarArticulo, useEliminarArticulo } from '@/hooks/useInventario';
import { IArticulo } from '@pos/shared';
import { Search, Plus, Copy, Pencil, Sliders, Trash2, AlertTriangle, Tag, Loader2, History, Upload, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { ArticuloForm } from './ArticuloForm';
import { AjustarInventarioModal } from './AjustarInventarioModal';
import { CategoriasModal } from './CategoriasModal';
import { MovimientosModal } from './MovimientosModal';
import { ImportarCSVModal } from './ImportarCSVModal';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { toast } from '@/store/toast.store';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { inventarioService } from '@/services/inventario.service';

export function InventarioTable() {
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [q, setQ]             = useState('');
  const [modalOpen, setModalOpen]               = useState(false);
  const [ajustarOpen, setAjustarOpen]           = useState(false);
  const [catOpen, setCatOpen]                   = useState(false);
  const [movimientosOpen, setMovimientosOpen]   = useState(false);
  const [importarOpen, setImportarOpen]         = useState(false);
  const [selected, setSelected]                 = useState<IArticulo | null>(null);
  const [confirmId, setConfirmId]               = useState<number | null>(null);

  const { data, isLoading } = useArticulos(page, 20, q);
  const clonar   = useClonarArticulo();
  const eliminar = useEliminarArticulo();

  const articulos  = data?.data ?? [];
  const pagination = data?.pagination;

  const handleEditar      = (a: IArticulo) => { setSelected(a); setModalOpen(true); };
  const handleNuevo       = ()              => { setSelected(null); setModalOpen(true); };
  const handleAjustar     = (a: IArticulo) => { setSelected(a); setAjustarOpen(true); };
  const handleMovimientos = (a: IArticulo) => { setSelected(a); setMovimientosOpen(true); };

  // Scanner global: busca por código de barras y abre el modal de ajuste
  const anyModalOpen = modalOpen || ajustarOpen || catOpen || movimientosOpen || importarOpen || confirmId !== null;
  useBarcodeScanner(async (codigo) => {
    try {
      const art = await inventarioService.getByBarcode(codigo);
      setSelected(art);
      setAjustarOpen(true);
    } catch {
      // No encontrado → poner código en el buscador
      setSearch(codigo);
      setQ(codigo);
      setPage(1);
      toast.info(`Sin artículo con código "${codigo}" — mostrando búsqueda`);
    }
  }, { disabled: anyModalOpen });

  const handleClonar = async (id: number) => {
    try { await clonar.mutateAsync(id); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al clonar'); }
  };

  const handleEliminar = (id: number) => setConfirmId(id);
  const confirmarEliminar = async () => {
    if (!confirmId) return;
    try { await eliminar.mutateAsync(confirmId); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar'); }
    finally { setConfirmId(null); }
  };

  return (
    <>
      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              className="input-field pl-9"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setQ(search); setPage(1); } }}
            />
          </div>
          <button onClick={() => { setQ(search); setPage(1); }} className="btn-outline">
            Buscar
          </button>
          {q && (
            <button onClick={() => { setSearch(''); setQ(''); setPage(1); }} className="btn-ghost text-navy-400 text-sm">
              Limpiar
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/inventario/buscar"
              className="btn-outline flex items-center gap-2 text-navy-600"
              title="Búsqueda rápida por código de barras"
            >
              <ScanLine size={14} />
              <span className="hidden sm:inline">Búsqueda Rápida</span>
            </Link>
            <button
              onClick={() => setCatOpen(true)}
              className="btn-outline flex items-center gap-2 text-navy-600"
            >
              <Tag size={14} />
              <span className="hidden sm:inline">Categorías</span>
            </button>
            <button
              onClick={() => setImportarOpen(true)}
              className="btn-outline flex items-center gap-2 text-navy-600"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Importar CSV</span>
            </button>
            <button onClick={handleNuevo} className="btn-primary flex items-center gap-2">
              <Plus size={15} />
              <span className="hidden sm:inline">Nuevo Artículo</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>

        {/* Count bar */}
        <div className="px-4 py-2.5 bg-navy-50/60 flex items-center gap-2">
          <span className="text-sm font-semibold text-navy-700">Inventario</span>
          <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            {pagination?.total ?? 0}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">ID</th>
                <th className="table-header">Cód. Barras</th>
                <th className="table-header">Nombre</th>
                <th className="table-header">Categoría</th>
                <th className="table-header hidden md:table-cell">Tamaño</th>
                <th className="table-header hidden sm:table-cell text-xs">Unidad</th>
                <th className="table-header hidden lg:table-cell">Costo</th>
                <th className="table-header">Precio</th>
                <th className="table-header">Stock</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-navy-400 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : articulos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="text-navy-400">
                      <Search size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No hay artículos{q ? ` para "${q}"` : ''}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                articulos.map((a: IArticulo) => {
                  const stockBajo = a.cantidad !== null && a.cantidad !== undefined && a.cantidad <= 10;
                  return (
                    <tr key={a.id} className="table-row-hover">
                      <td className="table-cell text-navy-400 text-xs">{a.id}</td>
                      <td className="table-cell font-mono text-xs text-navy-500">{a.codigoBarras}</td>
                      <td className="table-cell font-semibold text-navy-800">{a.nombre}</td>
                      <td className="table-cell">
                        {a.categoria?.nombre
                          ? <span className="badge-orange">{a.categoria.nombre}</span>
                          : <span className="text-navy-300 text-xs">—</span>}
                      </td>
                      <td className="table-cell hidden md:table-cell text-navy-500 text-xs">{a.tamanio ?? '—'}</td>
                      <td className="table-cell hidden sm:table-cell text-navy-500 text-xs">{a.unidadMedida?.trim() || '—'}</td>
                      <td className="table-cell hidden lg:table-cell text-navy-600">{formatCurrency(a.costo)}</td>
                      <td className="table-cell font-bold text-navy-900">{formatCurrency(a.precioVenta)}</td>
                      <td className="table-cell">
                        {a.cantidad !== null && a.cantidad !== undefined ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            stockBajo
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {stockBajo && <AlertTriangle size={10} />}
                            {a.cantidad.toLocaleString()}{a.unidadMedida?.trim() ? ` ${a.unidadMedida.trim()}` : ''}
                          </span>
                        ) : (
                          <span className="text-navy-300 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => handleMovimientos(a)}
                            title="Ver movimientos"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-purple-500 hover:bg-purple-50 transition-colors"
                          >
                            <History size={13} />
                          </button>
                          <button
                            onClick={() => handleAjustar(a)}
                            title="Ajustar inventario"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Sliders size={13} />
                          </button>
                          <button
                            onClick={() => handleClonar(a.id)}
                            disabled={clonar.isPending}
                            title="Clonar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-navy-400 hover:bg-navy-50 transition-colors"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => handleEditar(a)}
                            title="Editar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleEliminar(a.id)}
                            disabled={eliminar.isPending}
                            title="Eliminar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-1.5 p-4 justify-center border-t border-navy-100/40">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-navy-100 text-navy-600 hover:bg-navy-200 disabled:opacity-40 font-medium"
            >
              ← Ant
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 text-xs rounded-lg font-semibold ${
                  p === page
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                }`}
              >
                {p}
              </button>
            ))}
            {pagination.totalPages > 8 && <span className="text-navy-400 text-xs">…</span>}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-navy-100 text-navy-600 hover:bg-navy-200 disabled:opacity-40 font-medium"
            >
              Sig →
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <ArticuloForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        articulo={selected}
      />
      <AjustarInventarioModal
        open={ajustarOpen}
        onClose={() => setAjustarOpen(false)}
        articulo={selected}
      />
      <CategoriasModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
      />
      <MovimientosModal
        open={movimientosOpen}
        onClose={() => setMovimientosOpen(false)}
        articulo={selected}
      />
      <ImportarCSVModal
        open={importarOpen}
        onClose={() => setImportarOpen(false)}
      />

      {confirmId !== null && (
        <ModalOverlay onClose={() => setConfirmId(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <h3 className="font-semibold text-navy-800 mb-1">Eliminar artículo</h3>
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

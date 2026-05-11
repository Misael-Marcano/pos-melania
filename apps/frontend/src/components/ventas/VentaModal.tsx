'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IVenta, ICliente, IArticulo } from '@pos/shared';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { useAnularVenta, useFullEditarVenta } from '@/hooks/useVentas';
import { useClientes } from '@/hooks/useClientes';
import { inventarioService } from '@/services/inventario.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { nombreArticuloConUnidad } from '@/lib/format-articulo';
import { toast } from '@/store/toast.store';
import {
  X, Pencil, Ban, Loader2, Trash2, Search,
  AlertTriangle, Save, ArrowLeft, Printer,
} from 'lucide-react';
import { Receipt } from './Receipt';

const METODOS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'] as const;
const METODO_BADGE: Record<string, string> = {
  EFECTIVO: 'badge-green', TARJETA: 'badge-orange',
  TRANSFERENCIA: 'badge-gray', CREDITO: 'badge-red',
};

interface LineaEdit {
  articuloId:     number;
  nombre:         string;
  cantidad:       number;
  precioUnitario: number;
  descuento:      number;
}

interface Props {
  venta:          IVenta;
  isAdmin:        boolean;
  onClose:        () => void;
  onRefresh:      () => void;
}

export function VentaModal({ venta, isAdmin, onClose, onRefresh }: Props) {
  const isAnulada = venta.notas?.startsWith('[ANULADA]') ?? false;
  const [modo, setModo]               = useState<'ver' | 'editar'>('ver');
  const [confirmAnular, setConfirmAnular] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const initLineas = (): LineaEdit[] =>
    (venta.detalles ?? []).map(d => ({
      articuloId:     d.articulo.id,
      nombre:         d.articulo.nombre,
      cantidad:       d.cantidad,
      precioUnitario: d.precioUnitario,
      descuento:      d.descuento,
    }));

  const [lineas,     setLineas]     = useState<LineaEdit[]>(initLineas);
  const [metodoPago, setMetodoPago] = useState(venta.metodoPago);
  const [clienteId,  setClienteId]  = useState<number | null>(venta.cliente?.id ?? null);
  const [descuento,  setDescuento]  = useState(venta.descuento ?? 0);
  const [notas,      setNotas]      = useState(venta.notas?.replace('[ANULADA] ', '') ?? '');

  // ── Article search ──────────────────────────────────────────────────────────
  const [busqueda,     setBusqueda]     = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: artData, isFetching: artSearchLoading } = useQuery({
    queryKey: ['art-search', busqueda],
    queryFn:  () => inventarioService.getAll(1, 8, busqueda.trim()),
    enabled:  busqueda.trim().length >= 2,
    staleTime: 500,
  });
  const articulos: IArticulo[] = artData?.data ?? [];

  // ── Clients ─────────────────────────────────────────────────────────────────
  const { data: clientesData } = useClientes(1, 200);
  const clientes: ICliente[] = clientesData?.data ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────────
  const fullEditar = useFullEditarVenta();
  const anular     = useAnularVenta();

  // ── Derived totals ──────────────────────────────────────────────────────────
  const subtotal = lineas.reduce(
    (s, l) => s + l.precioUnitario * l.cantidad * (1 - l.descuento / 100), 0
  );
  const total = Math.max(0, subtotal - descuento);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const addArticulo = (art: IArticulo) => {
    setBusqueda('');
    setShowDropdown(false);
    setLineas(prev => {
      const existing = prev.findIndex(l => l.articuloId === art.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], cantidad: next[existing].cantidad + 1 };
        return next;
      }
      return [...prev, {
        articuloId:     art.id,
        nombre:         art.nombre,
        cantidad:       1,
        precioUnitario: art.precioVenta,
        descuento:      0,
      }];
    });
  };

  const removeLinea = (i: number) => setLineas(prev => prev.filter((_, idx) => idx !== i));

  const updateLinea = (i: number, field: keyof LineaEdit, val: number) => {
    setLineas(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: Math.max(0, val) };
      return next;
    });
  };

  const handleSave = async () => {
    if (lineas.length === 0) { toast.error('Debe haber al menos un artículo'); return; }
    try {
      await fullEditar.mutateAsync({
        id: venta.id,
        payload: {
          metodoPago,
          clienteId,
          descuento,
          notas: notas.trim() || null,
          detalles: lineas.map(l => ({
            articuloId:     l.articuloId,
            cantidad:       l.cantidad,
            precioUnitario: l.precioUnitario,
            descuento:      l.descuento,
          })),
        },
      });
      toast.success('Venta actualizada');
      onRefresh();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const handleAnular = async () => {
    try {
      await anular.mutateAsync(venta.id);
      toast.success('Venta anulada');
      onRefresh();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al anular');
    }
  };

  const enterEdit = () => {
    setLineas(initLineas());
    setMetodoPago(venta.metodoPago);
    setClienteId(venta.cliente?.id ?? null);
    setDescuento(venta.descuento ?? 0);
    setNotas(venta.notas?.replace('[ANULADA] ', '') ?? '');
    setModo('editar');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-navy-100/40 shrink-0">
          {modo === 'editar' && (
            <button onClick={() => setModo('ver')} className="text-navy-400 hover:text-navy-700">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-navy-800">
                Venta #{String(venta.id).padStart(6, '0')}
              </h3>
              {isAnulada
                ? <span className="badge-red text-[10px]">ANULADA</span>
                : <span className="badge-green text-[10px]">ACTIVA</span>}
              {modo === 'editar' && (
                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">EDITANDO</span>
              )}
            </div>
            <p className="text-xs text-navy-400 mt-0.5">{formatDateTime(venta.fecha)}</p>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-700 shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* ── Body: en edición, scroll solo arriba; la búsqueda de artículos va abajo (sin clip) ── */}
        <div
          className={
            modo === 'editar'
              ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
              : 'flex-1 overflow-y-auto'
          }
        >

          {/* ── VIEW MODE ──────────────────────────────────────────────────── */}
          {modo === 'ver' && (
            <div className="p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Cliente',         value: venta.cliente?.nombre ?? 'Consumidor final' },
                  { label: 'Método de pago',  value: <span className={METODO_BADGE[venta.metodoPago] ?? 'badge-gray'}>{venta.metodoPago}</span> },
                  { label: 'Comprobante',     value: <span className="font-mono text-xs">{venta.comprobante ?? '—'}</span> },
                ].map(item => (
                  <div key={item.label} className="bg-navy-50 rounded-xl p-3">
                    <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <div className="text-sm font-semibold text-navy-800">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Items table */}
              <div className="border border-navy-100 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-navy-50 border-b border-navy-100/40">
                  <p className="text-xs font-semibold text-navy-600 uppercase tracking-wider">Artículos</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-100/40">
                      <th className="table-header text-left">Artículo</th>
                      <th className="table-header text-center">Cant.</th>
                      <th className="table-header text-right">P. Unit.</th>
                      <th className="table-header text-right">Desc.</th>
                      <th className="table-header text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(venta.detalles ?? []).map((d, i) => (
                      <tr key={i} className="border-b border-navy-50 last:border-0">
                        <td className="table-cell font-medium text-navy-700">
                          {d.articulo ? nombreArticuloConUnidad(d.articulo) : '—'}
                        </td>
                        <td className="table-cell text-center text-navy-600">{d.cantidad}</td>
                        <td className="table-cell text-right text-navy-600">{formatCurrency(d.precioUnitario)}</td>
                        <td className="table-cell text-right text-navy-400">{d.descuento > 0 ? `${d.descuento}%` : '—'}</td>
                        <td className="table-cell text-right font-semibold text-navy-800">{formatCurrency(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-56 space-y-2 text-sm">
                  <div className="flex justify-between text-navy-600">
                    <span>Subtotal</span><span>{formatCurrency(venta.subtotal)}</span>
                  </div>
                  {(venta.descuento ?? 0) > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>Descuento</span><span>- {formatCurrency(venta.descuento ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-navy-900 border-t border-navy-100/40 pt-2">
                    <span>Total</span><span>{formatCurrency(venta.total)}</span>
                  </div>
                </div>
              </div>

              {venta.notas && !isAnulada && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700">{venta.notas}</p>
                </div>
              )}
            </div>
          )}

          {/* ── EDIT MODE ──────────────────────────────────────────────────── */}
          {modo === 'editar' && (
            <>
              <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5">
                {/* Header fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-navy-600 mb-1.5">Método de pago</label>
                    <select value={metodoPago} onChange={e => setMetodoPago(e.target.value as any)} className="input-field w-full">
                      {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy-600 mb-1.5">Cliente</label>
                    <select value={clienteId ?? ''} onChange={e => setClienteId(e.target.value ? Number(e.target.value) : null)} className="input-field w-full">
                      <option value="">Consumidor final</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy-600 mb-1.5">Descuento global (RDS)</label>
                    <input type="number" min={0} value={descuento} onChange={e => setDescuento(Math.max(0, Number(e.target.value)))} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy-600 mb-1.5">Notas</label>
                    <input value={notas} onChange={e => setNotas(e.target.value)} maxLength={500} className="input-field w-full" placeholder="Opcional..." />
                  </div>
                </div>

                <div className="border border-navy-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-navy-50 border-b border-navy-100/40 flex items-center justify-between rounded-t-xl">
                    <p className="text-xs font-semibold text-navy-600 uppercase tracking-wider">Artículos</p>
                    <span className="text-[10px] text-navy-400">{lineas.length} ítem(s)</span>
                  </div>

                  {lineas.length === 0 ? (
                    <div className="py-8 text-center text-navy-400 text-sm">Sin artículos. Usa el buscador de abajo para agregar.</div>
                  ) : (
                    <div className="divide-y divide-navy-50 overflow-x-auto max-h-[min(40vh,320px)] overflow-y-auto">
                      {lineas.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="flex-1 text-sm font-medium text-navy-700 truncate min-w-0">{l.nombre}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <label className="text-[10px] text-navy-400">Cant.</label>
                            <input type="number" min={1} value={l.cantidad}
                              onChange={e => updateLinea(i, 'cantidad', parseInt(e.target.value) || 1)}
                              className="w-16 input-field py-1 text-xs text-center" />
                            <label className="text-[10px] text-navy-400">Precio</label>
                            <input type="number" min={0} step={0.01} value={l.precioUnitario}
                              onChange={e => updateLinea(i, 'precioUnitario', parseFloat(e.target.value) || 0)}
                              className="w-24 input-field py-1 text-xs text-right" />
                            <label className="text-[10px] text-navy-400">Desc%</label>
                            <input type="number" min={0} max={100} value={l.descuento}
                              onChange={e => updateLinea(i, 'descuento', parseFloat(e.target.value) || 0)}
                              className="w-14 input-field py-1 text-xs text-center" />
                            <span className="text-xs font-semibold text-navy-700 w-20 text-right shrink-0">
                              {formatCurrency(l.precioUnitario * l.cantidad * (1 - l.descuento / 100))}
                            </span>
                            <button type="button" onClick={() => removeLinea(i)} className="text-rose-400 hover:text-rose-600 ml-1">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit totals */}
                <div className="flex justify-end">
                  <div className="w-56 space-y-2 text-sm">
                    <div className="flex justify-between text-navy-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    {descuento > 0 && (
                      <div className="flex justify-between text-rose-500"><span>Descuento</span><span>- {formatCurrency(descuento)}</span></div>
                    )}
                    <div className="flex justify-between font-bold text-navy-900 border-t border-navy-100/40 pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
                  </div>
                </div>
              </div>

              {/* Búsqueda fuera del área scroll: lista hacia arriba para no quedar bajo el pie del modal */}
              <div className="shrink-0 px-6 py-3 border-t border-navy-200/80 bg-navy-50/50 relative z-[70]">
                <p className="text-[10px] font-semibold text-navy-500 uppercase tracking-wider mb-2">Agregar artículo</p>
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center gap-2 input-field py-2 bg-white">
                    <Search size={14} className="text-navy-400 shrink-0" />
                    <input
                      value={busqueda}
                      onChange={e => { setBusqueda(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      className="flex-1 bg-transparent outline-none text-sm text-navy-800 placeholder:text-navy-400"
                      placeholder="Escribe 2+ letras para buscar…"
                      autoComplete="off"
                    />
                  </div>
                  {showDropdown && busqueda.trim().length >= 1 && (
                    <div
                      className="absolute bottom-full left-0 right-0 z-[100] mb-1 bg-white border border-navy-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                      role="listbox"
                    >
                      {busqueda.trim().length < 2 ? (
                        <p className="px-3 py-2.5 text-xs text-navy-500">Escribe al menos 2 caracteres para buscar.</p>
                      ) : artSearchLoading ? (
                        <p className="px-3 py-2.5 text-xs text-navy-500 flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin shrink-0" /> Buscando…
                        </p>
                      ) : articulos.length === 0 ? (
                        <p className="px-3 py-2.5 text-xs text-navy-500">No hay artículos con ese criterio.</p>
                      ) : (
                        articulos.map(art => (
                          <button
                            key={art.id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); addArticulo(art); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-primary-50 text-left border-b border-navy-50 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-navy-900">{art.nombre}</p>
                              <p className="text-xs text-navy-500">
                                Stock: {art.cantidad ?? '∞'}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-primary-600 shrink-0 tabular-nums">
                              {formatCurrency(art.precioVenta)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="border-t border-navy-100/40 px-6 py-4 flex items-center gap-2 shrink-0 bg-navy-50/40">
          {modo === 'ver' ? (
            <>
              <button onClick={onClose} className="btn-outline">Cerrar</button>
              <button onClick={() => setShowReceipt(true)} className="btn-outline flex items-center gap-2">
                <Printer size={14} /> Reimprimir
              </button>
              {isAdmin && !isAnulada && (
                <>
                  <button onClick={enterEdit} className="btn-primary flex items-center gap-2 ml-auto">
                    <Pencil size={14} /> Editar venta
                  </button>
                  {confirmAnular ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} /> ¿Confirmar?
                      </span>
                      <button onClick={() => setConfirmAnular(false)} className="btn-outline text-xs py-1.5 px-3">No</button>
                      <button onClick={handleAnular} disabled={anular.isPending}
                        className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1">
                        {anular.isPending ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                        Anular
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmAnular(true)} className="btn-danger flex items-center gap-2">
                      <Ban size={14} /> Anular
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setModo('ver')} className="btn-outline flex items-center gap-2">
                <ArrowLeft size={14} /> Cancelar
              </button>
              <button onClick={handleSave} disabled={fullEditar.isPending || lineas.length === 0}
                className="btn-primary flex items-center gap-2 ml-auto disabled:opacity-50">
                {fullEditar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar cambios
              </button>
            </>
          )}
        </div>

      </div>
    </ModalOverlay>

    {showReceipt && (
      <Receipt variant="detalle" venta={venta} onClose={() => setShowReceipt(false)} autoPrint={false} />
    )}
    </>
  );
}

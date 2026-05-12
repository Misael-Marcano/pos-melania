'use client';

import { useState } from 'react';
import {
  useCompras, useCrearOrden, useActualizarOrden,
  useEnviarOrden, useRecibirOrden, useCancelarOrden,
} from '@/hooks/useCompras';
import { useProveedores }  from '@/hooks/useProveedores';
import { useArticulos }    from '@/hooks/useInventario';
import { PageHeader }      from '@/components/layout/PageHeader';
import { IOrdenCompra, IOrdenCompraDetalle, IArticulo } from '@pos/shared';
import { formatCurrency }  from '@/lib/utils';
import {
  Plus, X, Loader2, AlertTriangle, Search, Trash2,
  ShoppingCart, ChevronDown, Package, Send, CheckCircle,
  Ban, ClipboardList, Eye, Pencil, Camera,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { Select } from '@/components/ui/Select';
import { toast } from '@/store/toast.store';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeCamera } from '@/components/common/BarcodeCamera';
import { inventarioService } from '@/services/inventario.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR:  'bg-navy-50 text-navy-500',
  ENVIADA:   'bg-blue-100 text-blue-700',
  RECIBIDA:  'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-rose-100 text-rose-600',
};

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR:  'Borrador',
  ENVIADA:   'Enviada',
  RECIBIDA:  'Recibida',
  CANCELADA: 'Cancelada',
};

// ── Línea de ítem en el formulario ────────────────────────────────────────────

interface LineaInput {
  articuloId:    number;
  nombre:        string;
  cantidad:      number;
  costoUnitario: number;
}

// ── Modal: Crear / Editar orden ───────────────────────────────────────────────

function OrdenModal({
  orden,
  onClose,
}: {
  orden:   IOrdenCompra | null;
  onClose: () => void;
}) {
  const [proveedorId,   setProveedorId]   = useState<number | ''>(orden?.proveedor?.id ?? '');
  const [notas,         setNotas]         = useState(orden?.notas ?? '');
  const [fechaEsperada, setFechaEsperada] = useState(orden?.fechaEsperada?.split('T')[0] ?? '');
  const [lineas,        setLineas]        = useState<LineaInput[]>(
    orden?.detalles.map((d) => ({
      articuloId:    d.articulo.id,
      nombre:        d.articulo.nombre,
      cantidad:      d.cantidad,
      costoUnitario: Number(d.costoUnitario),
    })) ?? []
  );
  const [artSearch,   setArtSearch]   = useState('');
  const [showPicker,  setShowPicker]  = useState(false);
  const [showCamera,  setShowCamera]  = useState(false);
  const [error,       setError]       = useState('');

  const { data: proveedores = [] } = useProveedores();
  const { data: artData }          = useArticulos(1, 50, artSearch);
  const articulos = artData?.data ?? [];

  const crear      = useCrearOrden();
  const actualizar = useActualizarOrden();
  const isPending  = crear.isPending || actualizar.isPending;

  // Scanner físico: agrega artículo directamente si está en la lista
  useBarcodeScanner(async (codigo) => {
    try {
      const art = await inventarioService.getByBarcode(codigo);
      addArticulo(art);
    } catch {
      setArtSearch(codigo);
      setShowPicker(true);
    }
  }, { disabled: showCamera });

  const total = lineas.reduce((s, l) => s + l.cantidad * l.costoUnitario, 0);

  const addArticulo = (art: IArticulo) => {
    if (lineas.some((l) => l.articuloId === art.id)) return;
    setLineas((p) => [...p, {
      articuloId:    art.id,
      nombre:        art.nombre,
      cantidad:      1,
      costoUnitario: Number(art.costo) || 0,
    }]);
    setArtSearch('');
    setShowPicker(false);
  };

  const removeLinea = (idx: number) => setLineas((p) => p.filter((_, i) => i !== idx));

  const setLinea = (idx: number, key: 'cantidad' | 'costoUnitario', val: number) =>
    setLineas((p) => p.map((l, i) => i === idx ? { ...l, [key]: Math.max(key === 'cantidad' ? 1 : 0, val) } : l));

  const handleSubmit = async () => {
    if (lineas.length === 0) { setError('Agrega al menos un artículo'); return; }
    try {
      setError('');
      const payload = {
        proveedorId:   proveedorId || undefined,
        notas:         notas || undefined,
        fechaEsperada: fechaEsperada || undefined,
        detalles:      lineas.map((l) => ({
          articuloId:    l.articuloId,
          cantidad:      l.cantidad,
          costoUnitario: l.costoUnitario,
        })),
      };
      if (orden) {
        await actualizar.mutateAsync({ id: orden.id, payload });
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
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40 flex-shrink-0">
          <h3 className="font-semibold text-navy-800">
            {orden ? 'Editar orden de compra' : 'Nueva orden de compra'}
          </h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Proveedor + fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Proveedor</label>
              <Select value={proveedorId === '' ? '' : String(proveedorId)}
                onChange={(e) => setProveedorId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Fecha esperada</label>
              <input type="date" className="input-field" value={fechaEsperada}
                onChange={(e) => setFechaEsperada(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Notas</label>
            <input className="input-field" value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones opcionales..." />
          </div>

          {/* Artículos */}
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-2">Artículos *</label>

            {lineas.length > 0 && (
              <div className="border border-navy-100 rounded-lg divide-y divide-navy-50 mb-2">
                {/* Encabezado tabla */}
                <div className="grid grid-cols-12 px-3 py-1.5 text-xs font-semibold text-navy-400 bg-navy-50/60">
                  <span className="col-span-5">Artículo</span>
                  <span className="col-span-2 text-center">Cant.</span>
                  <span className="col-span-3 text-right">Costo unit.</span>
                  <span className="col-span-1 text-right">Total</span>
                  <span className="col-span-1" />
                </div>
                {lineas.map((l, idx) => (
                  <div key={l.articuloId} className="grid grid-cols-12 items-center px-3 py-2 gap-1">
                    <div className="col-span-5 flex items-center gap-1.5">
                      <Package size={12} className="text-primary-500 flex-shrink-0" />
                      <span className="text-sm text-navy-700 truncate">{l.nombre}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-center gap-0.5">
                      <button onClick={() => setLinea(idx, 'cantidad', l.cantidad - 1)}
                        className="w-5 h-5 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-xs font-bold flex items-center justify-center">−</button>
                      <span className="w-7 text-center text-sm font-semibold">{l.cantidad}</span>
                      <button onClick={() => setLinea(idx, 'cantidad', l.cantidad + 1)}
                        className="w-5 h-5 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-xs font-bold flex items-center justify-center">+</button>
                    </div>
                    <div className="col-span-3">
                      <input type="number" min={0} step={0.01}
                        className="input-field text-right text-sm py-1"
                        value={l.costoUnitario}
                        onChange={(e) => setLinea(idx, 'costoUnitario', Number(e.target.value))} />
                    </div>
                    <span className="col-span-1 text-right text-sm font-semibold text-navy-700">
                      {formatCurrency(l.cantidad * l.costoUnitario)}
                    </span>
                    <button onClick={() => removeLinea(idx)}
                      className="col-span-1 flex justify-end text-navy-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {/* Total */}
                <div className="flex items-center justify-end gap-2 px-3 py-2 bg-navy-50/40">
                  <span className="text-sm font-semibold text-navy-600">Total:</span>
                  <span className="text-sm font-bold text-navy-800">{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            {/* Buscador artículos */}
            <div className="relative">
              <div className="flex gap-1.5">
                <div className="input-field flex items-center gap-2 flex-1">
                  <Search size={13} className="text-navy-400 flex-shrink-0" />
                  <input
                    className="flex-1 outline-none text-sm bg-transparent placeholder-navy-400"
                    placeholder="Buscar o escanear artículo..."
                    value={artSearch}
                    onChange={(e) => { setArtSearch(e.target.value); setShowPicker(true); }}
                    onFocus={() => setShowPicker(true)}
                  />
                  <ChevronDown size={13} className="text-navy-400 flex-shrink-0" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  title="Escanear con cámara"
                  className="px-2.5 rounded-lg border border-navy-200 text-navy-400 hover:border-primary-400 hover:text-primary-600 transition-colors shrink-0"
                >
                  <Camera size={15} />
                </button>
              </div>
              {showPicker && (artSearch || articulos.length > 0) && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-navy-100 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {articulos.length === 0 ? (
                    <p className="text-sm text-navy-400 px-3 py-4 text-center">Sin resultados</p>
                  ) : (
                    articulos
                      .filter((a) => !lineas.some((l) => l.articuloId === a.id))
                      .map((a: IArticulo) => (
                        <button key={a.id} onClick={() => addArticulo(a)}
                          className="w-full text-left px-3 py-2.5 hover:bg-navy-50 flex items-center gap-2.5 transition-colors">
                          <Package size={13} className="text-primary-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-navy-700">{a.nombre}</p>
                            <p className="text-xs text-navy-400">
                              Stock: {a.cantidad ?? '∞'} · Costo: {formatCurrency(a.costo)}
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

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40 flex-shrink-0">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
            {isPending ? 'Guardando...' : orden ? 'Actualizar' : 'Crear orden'}
          </button>
        </div>
      </div>

      {showCamera && (
        <BarcodeCamera
          onDetect={async (codigo) => {
            try {
              const art = await inventarioService.getByBarcode(codigo);
              addArticulo(art);
            } catch {
              setArtSearch(codigo);
              setShowPicker(true);
            }
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </ModalOverlay>
  );
}

// ── Modal: Recibir mercancía ──────────────────────────────────────────────────

function RecibirModal({ orden, onClose }: { orden: IOrdenCompra; onClose: () => void }) {
  const [cantidades, setCantidades] = useState<Record<number, number>>(
    Object.fromEntries(
      orden.detalles.map((d) => [d.id, d.cantidad - d.cantidadRecibida])
    )
  );
  const [error, setError] = useState('');
  const recibir = useRecibirOrden();

  const pendientes = orden.detalles.filter((d) => d.cantidadRecibida < d.cantidad);

  const handleSubmit = async () => {
    const recepciones = pendientes
      .map((d) => ({ detalleId: d.id, cantidadRecibida: cantidades[d.id] ?? 0 }))
      .filter((r) => r.cantidadRecibida > 0);

    if (recepciones.length === 0) { setError('Ingresa al menos una cantidad a recibir'); return; }

    try {
      setError('');
      await recibir.mutateAsync({ id: orden.id, recepciones });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar recepción');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40">
          <h3 className="font-semibold text-navy-800">Recibir mercancía — Orden #{orden.id}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-navy-500">
            Indica cuántas unidades recibes de cada artículo. El stock se actualizará automáticamente.
          </p>

          <div className="border border-navy-100 rounded-lg divide-y divide-navy-50">
            {pendientes.map((d: IOrdenCompraDetalle) => {
              const maxRecibir = d.cantidad - d.cantidadRecibida;
              return (
                <div key={d.id} className="flex items-center gap-3 px-3 py-3">
                  <Package size={14} className="text-primary-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-700 truncate">{d.articulo.nombre}</p>
                    <p className="text-xs text-navy-400">
                      Pedido: {d.cantidad} · Ya recibido: {d.cantidadRecibida} · Pendiente: {maxRecibir}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setCantidades((p) => ({ ...p, [d.id]: Math.max(0, (p[d.id] ?? 0) - 1) }))}
                      className="w-6 h-6 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-sm font-bold flex items-center justify-center">−</button>
                    <input
                      type="number" min={0} max={maxRecibir}
                      className="w-14 text-center border border-navy-200 rounded-md text-sm py-0.5 font-semibold"
                      value={cantidades[d.id] ?? 0}
                      onChange={(e) => setCantidades((p) => ({
                        ...p, [d.id]: Math.min(maxRecibir, Math.max(0, Number(e.target.value))),
                      }))} />
                    <button
                      onClick={() => setCantidades((p) => ({ ...p, [d.id]: Math.min(maxRecibir, (p[d.id] ?? 0) + 1) }))}
                      className="w-6 h-6 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-sm font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={recibir.isPending}
            className="btn-primary flex items-center gap-2">
            {recibir.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {recibir.isPending ? 'Registrando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Modal: Ver detalle de orden ───────────────────────────────────────────────

function DetalleModal({ orden, onClose }: { orden: IOrdenCompra; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-navy-800">Orden de compra #{orden.id}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[orden.estado]}`}>
              {ESTADO_LABEL[orden.estado]}
            </span>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Proveedor</p>
              <p className="font-medium text-navy-700">{orden.proveedor?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Creado por</p>
              <p className="font-medium text-navy-700">{orden.creadoPor?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Fecha esperada</p>
              <p className="font-medium text-navy-700">
                {orden.fechaEsperada ? new Date(orden.fechaEsperada).toLocaleDateString('es-DO') : '—'}
              </p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Fecha recibida</p>
              <p className="font-medium text-navy-700">
                {orden.fechaRecibida ? new Date(orden.fechaRecibida).toLocaleDateString('es-DO') : '—'}
              </p>
            </div>
            {orden.notas && (
              <div className="col-span-2">
                <p className="text-navy-400 text-xs mb-0.5">Notas</p>
                <p className="font-medium text-navy-700">{orden.notas}</p>
              </div>
            )}
          </div>

          <div className="border border-navy-100 rounded-lg divide-y divide-navy-50">
            <div className="grid grid-cols-12 px-3 py-1.5 text-xs font-semibold text-navy-400 bg-navy-50/60">
              <span className="col-span-5">Artículo</span>
              <span className="col-span-2 text-center">Pedido</span>
              <span className="col-span-2 text-center">Recibido</span>
              <span className="col-span-3 text-right">Subtotal</span>
            </div>
            {orden.detalles.map((d: IOrdenCompraDetalle) => (
              <div key={d.id} className="grid grid-cols-12 items-center px-3 py-2.5 text-sm">
                <span className="col-span-5 text-navy-700 font-medium truncate">{d.articulo.nombre}</span>
                <span className="col-span-2 text-center text-navy-500">{d.cantidad}</span>
                <span className={`col-span-2 text-center font-semibold ${
                  d.cantidadRecibida >= d.cantidad ? 'text-emerald-600' :
                  d.cantidadRecibida > 0 ? 'text-amber-600' : 'text-navy-400'
                }`}>{d.cantidadRecibida}</span>
                <span className="col-span-3 text-right text-navy-700">{formatCurrency(Number(d.total))}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2 bg-navy-50/40">
              <span className="text-sm font-semibold text-navy-600">Total</span>
              <span className="text-sm font-bold text-navy-800">{formatCurrency(Number(orden.total))}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 border-t border-navy-100/40 flex-shrink-0">
          <button onClick={onClose} className="btn-outline">Cerrar</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

type ModalMode = 'crear' | 'editar' | 'ver' | 'recibir' | null;

export default function ComprasPage() {
  const [filtroEstado,  setFiltroEstado]  = useState<string>('');
  const [modalMode,     setModalMode]     = useState<ModalMode>(null);
  const [selected,      setSelected]      = useState<IOrdenCompra | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; action: () => Promise<void> } | null>(null);

  const { data: ordenes = [], isLoading } = useCompras(filtroEstado || undefined);
  const enviar   = useEnviarOrden();
  const cancelar = useCancelarOrden();

  const openModal = (mode: ModalMode, orden?: IOrdenCompra) => {
    setSelected(orden ?? null);
    setModalMode(mode);
  };
  const closeModal = () => { setModalMode(null); setSelected(null); };

  const handleEnviar = (orden: IOrdenCompra) => {
    setConfirmAction({
      label: `¿Marcar la orden #${orden.id} como enviada al proveedor?`,
      action: async () => {
        try { await enviar.mutateAsync(orden.id); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
      },
    });
  };

  const handleCancelar = (orden: IOrdenCompra) => {
    setConfirmAction({
      label: `¿Cancelar la orden #${orden.id}? Esta acción no se puede deshacer.`,
      action: async () => {
        try { await cancelar.mutateAsync(orden.id); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
      },
    });
  };

  const FILTROS = [
    { label: 'Todas',     value: '' },
    { label: 'Borrador',  value: 'BORRADOR' },
    { label: 'Enviadas',  value: 'ENVIADA' },
    { label: 'Recibidas', value: 'RECIBIDA' },
    { label: 'Canceladas',value: 'CANCELADA' },
  ];

  return (
    <>
      <main aria-labelledby="compras-heading">
        <h1 id="compras-heading" className="sr-only">Órdenes de compra</h1>
        <div className="space-y-4">
          <PageHeader title="Órdenes de compra" breadcrumb={['Panel', 'Compras']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
            {/* Filtros por estado */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTROS.map((f) => (
                <button key={f.value}
                  onClick={() => setFiltroEstado(f.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    filtroEstado === f.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => openModal('crear')}
              className="btn-primary flex items-center gap-2 ml-auto">
              <Plus size={15} /> Nueva Orden
            </button>
          </div>

          {/* Count bar */}
          <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-700">Órdenes</span>
            <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {ordenes.length}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Proveedor</th>
                  <th className="table-header hidden md:table-cell">Artículos</th>
                  <th className="table-header hidden md:table-cell">Fecha esperada</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-right">Total</th>
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
                ) : ordenes.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-navy-400">
                    <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay órdenes de compra</p>
                  </td></tr>
                ) : (
                  ordenes.map((o: IOrdenCompra) => (
                    <tr key={o.id} className="table-row-hover">
                      <td className="table-cell font-mono text-navy-400 text-sm">#{o.id}</td>
                      <td className="table-cell">
                        <p className="font-medium text-navy-800">
                          {o.proveedor?.nombre ?? <span className="text-navy-400 italic">Sin proveedor</span>}
                        </p>
                        {o.notas && <p className="text-xs text-navy-400 mt-0.5 truncate max-w-[180px]">{o.notas}</p>}
                      </td>
                      <td className="table-cell hidden md:table-cell text-navy-500 text-sm">
                        {o.detalles.length} artículo{o.detalles.length !== 1 ? 's' : ''}
                      </td>
                      <td className="table-cell hidden md:table-cell text-navy-500 text-sm">
                        {o.fechaEsperada
                          ? new Date(o.fechaEsperada).toLocaleDateString('es-DO')
                          : '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[o.estado]}`}>
                          {ESTADO_LABEL[o.estado]}
                        </span>
                      </td>
                      <td className="table-cell text-right font-bold text-navy-700">
                        {formatCurrency(Number(o.total))}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-0.5">
                          {/* Ver */}
                          <button onClick={() => openModal('ver', o)} title="Ver detalle"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors">
                            <Eye size={13} />
                          </button>
                          {/* Editar (solo borrador) */}
                          {o.estado === 'BORRADOR' && (
                            <button onClick={() => openModal('editar', o)} title="Editar"
                              className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors">
                              <Pencil size={13} />
                            </button>
                          )}
                          {/* Enviar (solo borrador) */}
                          {o.estado === 'BORRADOR' && (
                            <button onClick={() => handleEnviar(o)}
                              disabled={enviar.isPending} title="Marcar como enviada"
                              className="w-7 h-7 flex items-center justify-center rounded-md text-blue-500 hover:bg-blue-50 transition-colors">
                              <Send size={13} />
                            </button>
                          )}
                          {/* Recibir (enviada o borrador) */}
                          {(o.estado === 'ENVIADA' || o.estado === 'BORRADOR') && (
                            <button onClick={() => openModal('recibir', o)} title="Recibir mercancía"
                              className="w-7 h-7 flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <CheckCircle size={13} />
                            </button>
                          )}
                          {/* Cancelar */}
                          {(o.estado === 'BORRADOR' || o.estado === 'ENVIADA') && (
                            <button onClick={() => handleCancelar(o)}
                              disabled={cancelar.isPending} title="Cancelar orden"
                              className="w-7 h-7 flex items-center justify-center rounded-md text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                              <Ban size={13} />
                            </button>
                          )}
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

      {/* Modals */}
      {(modalMode === 'crear' || modalMode === 'editar') && (
        <OrdenModal orden={modalMode === 'editar' ? selected : null} onClose={closeModal} />
      )}
      {modalMode === 'ver' && selected && (
        <DetalleModal orden={selected} onClose={closeModal} />
      )}
      {modalMode === 'recibir' && selected && (
        <RecibirModal orden={selected} onClose={closeModal} />
      )}

      {confirmAction && (
        <ModalOverlay onClose={() => setConfirmAction(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-navy-700">{confirmAction.label}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="btn-outline">Cancelar</button>
              <button
                onClick={async () => {
                  const fn = confirmAction.action;
                  setConfirmAction(null);
                  await fn();
                }}
                className="btn-primary">
                Confirmar
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

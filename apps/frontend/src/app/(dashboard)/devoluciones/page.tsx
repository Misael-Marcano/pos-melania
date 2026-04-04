'use client';

import { useState } from 'react';
import {
  useDevoluciones, useCrearDevolucion,
  useAprobarDevolucion, useRechazarDevolucion,
} from '@/hooks/useDevoluciones';
import { useVenta }     from '@/hooks/useVentas';
import { PageHeader }   from '@/components/layout/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { IDevolucion, IDevolucionDetalle, IVenta, IVentaDetalle, MetodoPago } from '@pos/shared';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Plus, X, Loader2, AlertTriangle, Search,
  RotateCcw, CheckCircle, XCircle, Eye, Package,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { toast } from '@/store/toast.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  APROBADA:  'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-rose-100 text-rose-600',
};

const MOTIVOS = [
  'Producto defectuoso',
  'Error en pedido',
  'Producto equivocado',
  'No cumple expectativas',
  'Cambio de opinión',
  'Otro',
];

const METODOS: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'];

// ── Buscador de venta ─────────────────────────────────────────────────────────

function VentaSearch({ onSelect }: { onSelect: (v: IVenta) => void }) {
  const [input,    setInput]    = useState('');
  const [ventaId,  setVentaId]  = useState<number | null>(null);
  const [touched,  setTouched]  = useState(false);

  const { data: venta, isLoading, isError } = useVenta(ventaId ?? 0);

  const handleBuscar = () => {
    const n = parseInt(input.replace('#', '').trim());
    if (!isNaN(n) && n > 0) { setVentaId(n); setTouched(true); }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-navy-700 block">Número de venta *</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 text-sm">#</span>
          <input className="input-field pl-7" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBuscar(); }}
            placeholder="Ej: 42" />
        </div>
        <button onClick={handleBuscar} className="btn-outline flex items-center gap-2">
          <Search size={14} /> Buscar
        </button>
      </div>

      {isLoading && ventaId && (
        <div className="flex items-center gap-2 text-navy-400 text-sm">
          <Loader2 size={14} className="animate-spin" /> Buscando...
        </div>
      )}

      {touched && isError && (
        <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
          <AlertTriangle size={14} /> Venta #{ventaId} no encontrada
        </div>
      )}

      {venta && !isError && (
        <div className="border border-navy-100 rounded-lg p-3 bg-navy-50/40">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-navy-800">
                Venta #{String(venta.id).padStart(6, '0')}
              </p>
              <p className="text-xs text-navy-400">{formatDateTime(venta.fecha)}</p>
            </div>
            <p className="text-sm font-bold text-navy-700">{formatCurrency(venta.total)}</p>
          </div>
          <p className="text-xs text-navy-500 mb-2">
            Cliente: {venta.cliente?.nombre ?? 'Consumidor final'} · {venta.metodoPago}
          </p>
          <div className="space-y-1 mb-3">
            {venta.detalles.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs text-navy-600">
                <Package size={10} className="text-navy-400" />
                <span>{d.articulo.nombre}</span>
                <span className="text-navy-400">×{d.cantidad}</span>
                <span className="ml-auto">{formatCurrency(d.total)}</span>
              </div>
            ))}
          </div>
          <button onClick={() => onSelect(venta)}
            className="btn-primary w-full text-sm py-1.5">
            Seleccionar esta venta
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal: Crear devolución ───────────────────────────────────────────────────

function CrearModal({ onClose }: { onClose: () => void }) {
  const [step,            setStep]            = useState<'buscar' | 'detalle'>('buscar');
  const [venta,           setVenta]           = useState<IVenta | null>(null);
  const [motivo,          setMotivo]          = useState(MOTIVOS[0]);
  const [motivoCustom,    setMotivoCustom]    = useState('');
  const [notas,           setNotas]           = useState('');
  const [metodoReembolso, setMetodoReembolso] = useState<MetodoPago>('EFECTIVO');
  const [seleccion,       setSeleccion]       = useState<Record<number, { activo: boolean; cantidad: number; regresa: boolean }>>({});
  const [error,           setError]           = useState('');

  const crear     = useCrearDevolucion();

  const handleSelectVenta = (v: IVenta) => {
    setVenta(v);
    // Inicializar selección con todos los ítems activos
    const init: typeof seleccion = {};
    v.detalles.forEach((d) => { init[d.id] = { activo: true, cantidad: d.cantidad, regresa: true }; });
    setSeleccion(init);
    setStep('detalle');
  };

  const toggleDetalle = (id: number) =>
    setSeleccion((p) => ({ ...p, [id]: { ...p[id], activo: !p[id].activo } }));

  const setCantidad = (id: number, val: number, max: number) =>
    setSeleccion((p) => ({ ...p, [id]: { ...p[id], cantidad: Math.min(max, Math.max(1, val)) } }));

  const toggleRegresa = (id: number) =>
    setSeleccion((p) => ({ ...p, [id]: { ...p[id], regresa: !p[id].regresa } }));

  const selectedDetalles = venta?.detalles.filter((d) => seleccion[d.id]?.activo) ?? [];
  const total = selectedDetalles.reduce((s, d) => {
    const sel = seleccion[d.id];
    return s + (sel?.cantidad ?? 0) * Number(d.precioUnitario);
  }, 0);

  const handleSubmit = async () => {
    if (!venta) return;
    if (selectedDetalles.length === 0) { setError('Selecciona al menos un artículo'); return; }
    const motivoFinal = motivo === 'Otro' ? (motivoCustom.trim() || 'Otro') : motivo;
    try {
      setError('');
      await crear.mutateAsync({
        ventaId:          venta.id,
        motivo:           motivoFinal,
        notas:            notas || undefined,
        metodoReembolso,
        detalles: selectedDetalles.map((d) => ({
          articuloId:         d.articulo.id,
          cantidad:           seleccion[d.id].cantidad,
          precioUnitario:     Number(d.precioUnitario),
          regresaAInventario: seleccion[d.id].regresa,
        })),
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-navy-800">Nueva devolución</h3>
            {step === 'detalle' && venta && (
              <p className="text-xs text-navy-400 mt-0.5">Venta #{String(venta.id).padStart(6, '0')}</p>
            )}
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {step === 'buscar' ? (
            <VentaSearch onSelect={handleSelectVenta} />
          ) : venta ? (
            <>
              {/* Artículos a devolver */}
              <div>
                <label className="text-sm font-medium text-navy-700 block mb-2">
                  Artículos a devolver
                </label>
                <div className="border border-navy-100 rounded-lg divide-y divide-navy-50">
                  {venta.detalles.map((d: IVentaDetalle) => {
                    const sel = seleccion[d.id];
                    return (
                      <div key={d.id} className={`px-3 py-2.5 transition-colors ${!sel?.activo ? 'opacity-40' : ''}`}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={sel?.activo ?? false}
                            onChange={() => toggleDetalle(d.id)}
                            className="rounded border-navy-300 text-primary-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-navy-700 truncate">{d.articulo.nombre}</p>
                            <p className="text-xs text-navy-400">
                              {formatCurrency(Number(d.precioUnitario))} c/u · Vendido: {d.cantidad}
                            </p>
                          </div>
                          {sel?.activo && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => setCantidad(d.id, (sel.cantidad ?? 1) - 1, d.cantidad)}
                                className="w-6 h-6 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-sm font-bold flex items-center justify-center">−</button>
                              <span className="w-7 text-center text-sm font-semibold">{sel.cantidad}</span>
                              <button onClick={() => setCantidad(d.id, (sel.cantidad ?? 1) + 1, d.cantidad)}
                                className="w-6 h-6 rounded border border-navy-200 text-navy-500 hover:bg-navy-50 text-sm font-bold flex items-center justify-center">+</button>
                            </div>
                          )}
                        </div>
                        {sel?.activo && (
                          <div className="mt-2 ml-7 flex items-center gap-2">
                            <input type="checkbox" id={`inv-${d.id}`}
                              checked={sel.regresa ?? true}
                              onChange={() => toggleRegresa(d.id)}
                              className="rounded border-navy-300 text-primary-600" />
                            <label htmlFor={`inv-${d.id}`} className="text-xs text-navy-500 cursor-pointer">
                              Regresar al inventario
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedDetalles.length > 0 && (
                  <div className="flex justify-between items-center mt-2 px-1">
                    <span className="text-xs text-navy-500">Total a reembolsar</span>
                    <span className="text-sm font-bold text-navy-800">{formatCurrency(total)}</span>
                  </div>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="text-sm font-medium text-navy-700 block mb-1.5">Motivo *</label>
                <select className="input-field" value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}>
                  {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                </select>
                {motivo === 'Otro' && (
                  <input className="input-field mt-2" value={motivoCustom}
                    onChange={(e) => setMotivoCustom(e.target.value)}
                    placeholder="Describe el motivo..." />
                )}
              </div>

              {/* Método reembolso */}
              <div>
                <label className="text-sm font-medium text-navy-700 block mb-1.5">Método de reembolso</label>
                <select className="input-field" value={metodoReembolso}
                  onChange={(e) => setMetodoReembolso(e.target.value as MetodoPago)}>
                  {METODOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="text-sm font-medium text-navy-700 block mb-1.5">Notas (opcional)</label>
                <input className="input-field" value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones adicionales..." />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex justify-between gap-2 px-5 py-4 border-t border-navy-100/40 flex-shrink-0">
          {step === 'detalle' ? (
            <button onClick={() => { setStep('buscar'); setVenta(null); }} className="btn-ghost text-navy-500 text-sm">
              ← Cambiar venta
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline">Cancelar</button>
            {step === 'detalle' && (
              <button onClick={handleSubmit} disabled={crear.isPending}
                className="btn-primary flex items-center gap-2">
                {crear.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                {crear.isPending ? 'Registrando...' : 'Registrar devolución'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Modal: Ver detalle ────────────────────────────────────────────────────────

function DetalleModal({ dev, onClose }: { dev: IDevolucion; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-navy-800">Devolución #{dev.id}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[dev.estado]}`}>
              {dev.estado}
            </span>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Venta original</p>
              <p className="font-medium text-navy-700">#{String(dev.venta.id).padStart(6, '0')}</p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Fecha</p>
              <p className="font-medium text-navy-700">{formatDateTime(dev.createdAt)}</p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Motivo</p>
              <p className="font-medium text-navy-700">{dev.motivo}</p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Método reembolso</p>
              <p className="font-medium text-navy-700">{dev.metodoReembolso}</p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Creado por</p>
              <p className="font-medium text-navy-700">{dev.creadoPor?.nombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-navy-400 text-xs mb-0.5">Revisado por</p>
              <p className="font-medium text-navy-700">{dev.revisadoPor?.nombre ?? '—'}</p>
            </div>
            {dev.notas && (
              <div className="col-span-2">
                <p className="text-navy-400 text-xs mb-0.5">Notas</p>
                <p className="font-medium text-navy-700 text-sm">{dev.notas}</p>
              </div>
            )}
          </div>

          <div className="border border-navy-100 rounded-lg divide-y divide-navy-50">
            <div className="grid grid-cols-12 px-3 py-1.5 text-xs font-semibold text-navy-400 bg-navy-50/60">
              <span className="col-span-5">Artículo</span>
              <span className="col-span-2 text-center">Cant.</span>
              <span className="col-span-2 text-center">Inventario</span>
              <span className="col-span-3 text-right">Subtotal</span>
            </div>
            {dev.detalles.map((d: IDevolucionDetalle) => (
              <div key={d.id} className="grid grid-cols-12 items-center px-3 py-2.5 text-sm">
                <span className="col-span-5 text-navy-700 font-medium truncate">{d.articulo.nombre}</span>
                <span className="col-span-2 text-center text-navy-500">{d.cantidad}</span>
                <span className={`col-span-2 text-center text-xs font-medium ${d.regresaAInventario ? 'text-emerald-600' : 'text-navy-400'}`}>
                  {d.regresaAInventario ? 'Sí' : 'No'}
                </span>
                <span className="col-span-3 text-right text-navy-700">{formatCurrency(Number(d.total))}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2 bg-navy-50/40">
              <span className="text-sm font-semibold text-navy-600">Total reembolso</span>
              <span className="text-sm font-bold text-navy-800">{formatCurrency(Number(dev.total))}</span>
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

// ── Modal: Rechazar ───────────────────────────────────────────────────────────

function RechazarModal({ dev, onClose }: { dev: IDevolucion; onClose: () => void }) {
  const [motivo,  setMotivo]  = useState('');
  const rechazar = useRechazarDevolucion();

  const handleSubmit = async () => {
    try {
      await rechazar.mutateAsync({ id: dev.id, motivo: motivo || undefined });
      onClose();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40">
          <h3 className="font-semibold text-navy-800">Rechazar devolución #{dev.id}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-navy-500">Indica el motivo del rechazo (opcional):</p>
          <input className="input-field" value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Fuera del plazo de devolución..." />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={rechazar.isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            {rechazar.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Rechazar
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

type ModalMode = 'crear' | 'ver' | 'rechazar' | null;

export default function DevolucionesPage() {
  const user = useAuthStore((s) => s.user);
  const [filtroEstado,   setFiltroEstado]   = useState('');
  const [modalMode,      setModalMode]      = useState<ModalMode>(null);
  const [selected,       setSelected]       = useState<IDevolucion | null>(null);
  const [confirmAction,  setConfirmAction]  = useState<{ label: string; action: () => Promise<void> } | null>(null);

  const { data: devoluciones = [], isLoading } = useDevoluciones(filtroEstado || undefined);
  const aprobar = useAprobarDevolucion();

  const openModal = (mode: ModalMode, dev?: IDevolucion) => {
    setSelected(dev ?? null);
    setModalMode(mode);
  };
  const closeModal = () => { setModalMode(null); setSelected(null); };

  const handleAprobar = (dev: IDevolucion) => {
    setConfirmAction({
      label: `¿Aprobar la devolución #${dev.id}? Se actualizará el inventario.`,
      action: async () => {
        try { await aprobar.mutateAsync(dev.id); }
        catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
      },
    });
  };

  const FILTROS = [
    { label: 'Todas',     value: '' },
    { label: 'Pendientes',value: 'PENDIENTE' },
    { label: 'Aprobadas', value: 'APROBADA' },
    { label: 'Rechazadas',value: 'RECHAZADA' },
  ];

  return (
    <>
      <div className="space-y-4">
        <PageHeader title="Devoluciones" breadcrumb={['Panel', 'Devoluciones']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
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
            {user?.rol === 'admin' && (
              <button onClick={() => openModal('crear')}
                className="btn-primary flex items-center gap-2 ml-auto">
                <Plus size={15} /> Nueva Devolución
              </button>
            )}
          </div>

          {/* Count bar */}
          <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-700">Devoluciones</span>
            <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {devoluciones.length}
            </span>
            {filtroEstado === 'PENDIENTE' && devoluciones.length > 0 && (
              <span className="ml-2 text-xs text-amber-600 font-medium">
                ⚠ {devoluciones.length} pendiente{devoluciones.length !== 1 ? 's' : ''} de revisión
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Venta</th>
                  <th className="table-header hidden md:table-cell">Motivo</th>
                  <th className="table-header hidden md:table-cell">Artículos</th>
                  <th className="table-header hidden lg:table-cell">Reembolso</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-navy-400 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Cargando...
                    </div>
                  </td></tr>
                ) : devoluciones.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-navy-400">
                    <RotateCcw size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay devoluciones</p>
                  </td></tr>
                ) : (
                  devoluciones.map((d: IDevolucion) => (
                    <tr key={d.id} className="table-row-hover">
                      <td className="table-cell font-mono text-navy-400 text-sm">#{d.id}</td>
                      <td className="table-cell">
                        <p className="font-medium text-navy-800">
                          Venta #{String(d.venta.id).padStart(6, '0')}
                        </p>
                        <p className="text-xs text-navy-400">
                          {d.venta.cliente?.nombre ?? 'Consumidor final'}
                        </p>
                      </td>
                      <td className="table-cell hidden md:table-cell text-navy-500 text-sm">
                        {d.motivo}
                      </td>
                      <td className="table-cell hidden md:table-cell text-center text-navy-500 text-sm">
                        {d.detalles.length}
                      </td>
                      <td className="table-cell hidden lg:table-cell text-navy-500 text-sm">
                        {d.metodoReembolso}
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[d.estado]}`}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="table-cell text-right font-bold text-navy-700">
                        {formatCurrency(Number(d.total))}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => openModal('ver', d)} title="Ver detalle"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors">
                            <Eye size={13} />
                          </button>
                          {user?.rol === 'admin' && d.estado === 'PENDIENTE' && (
                            <>
                              <button onClick={() => handleAprobar(d)}
                                disabled={aprobar.isPending} title="Aprobar"
                                className="w-7 h-7 flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors">
                                <CheckCircle size={13} />
                              </button>
                              <button onClick={() => openModal('rechazar', d)} title="Rechazar"
                                className="w-7 h-7 flex items-center justify-center rounded-md text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                <XCircle size={13} />
                              </button>
                            </>
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

      {modalMode === 'crear' && <CrearModal onClose={closeModal} />}
      {modalMode === 'ver'    && selected && <DetalleModal dev={selected} onClose={closeModal} />}
      {modalMode === 'rechazar' && selected && <RechazarModal dev={selected} onClose={closeModal} />}

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

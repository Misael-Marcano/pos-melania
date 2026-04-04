'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { inventarioService }  from '@/services/inventario.service';
import { clientesService }    from '@/services/clientes.service';
import { ventasService }      from '@/services/ventas.service';
import { useCartStore }       from '@/store/cart.store';
import { usePausedCartsStore } from '@/store/pausedCarts.store';
import { useCajaActiva }      from '@/hooks/useVentas';
import { toast }              from '@/store/toast.store';
import { IArticulo, ICliente } from '@pos/shared';
import { formatCurrency }     from '@/lib/utils';
import { AperturaCaja }       from './AperturaCaja';
import { CierreCaja }         from './CierreCaja';
import { Receipt }            from './Receipt';
import {
  ShoppingCart, Grid3X3, Plus, Minus, Trash2,
  UserPlus, X, Search, Lock, ArrowLeft,
  Banknote, CreditCard, Smartphone, BookOpen,
  CheckCircle, ChevronDown, PauseCircle, PlayCircle, Clock,
  Gift, Loader2,
} from 'lucide-react';
import { tarjetasRegaloService, ITarjetaRegalo } from '@/services/tarjetas-regalo.service';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { promocionesService } from '@/services/promociones.service';

type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO' | 'TARJETA_REGALO';
type TipoNCF    = '01' | '02' | '04' | '14' | '15';

const METODOS: { id: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { id: 'EFECTIVO',       label: 'Efectivo',      icon: <Banknote  size={18} /> },
  { id: 'TARJETA',        label: 'Tarjeta',        icon: <CreditCard size={18} /> },
  { id: 'TRANSFERENCIA',  label: 'Transfer.',      icon: <Smartphone size={18} /> },
  { id: 'CREDITO',        label: 'Crédito',        icon: <BookOpen  size={18} /> },
  { id: 'TARJETA_REGALO', label: 'T. Regalo',      icon: <Gift      size={18} /> },
];

const TIPOS_NCF: { id: TipoNCF; label: string }[] = [
  { id: '01', label: 'B01 — Crédito Fiscal' },
  { id: '02', label: 'B02 — Consumo' },
  { id: '04', label: 'B04 — Nota de Crédito' },
  { id: '14', label: 'B14 — Régimen Especial' },
  { id: '15', label: 'B15 — Gubernamental' },
];

const BILLETES = [2000, 1000, 500, 200, 100, 50];

// ─────────────────────────────────────────────────────────────────────────────
export function POSScreen() {
  const {
    items, addItem, removeItem, updateCantidad, updateDescuento,
    setCliente, clienteId, clearCart, subtotal, total, descuentoGlobal,
    setDescuentoGlobal,
  } = useCartStore();

  // ── Config ────────────────────────────────────────────────────────────────
  const { data: cfg } = useConfiguracion();
  const CAJA_NOMBRE = cfg?.nombreCaja ?? 'CAJA 1';

  // ── Caja ─────────────────────────────────────────────────────────────────
  const { data: cajaActiva, isLoading: cajaLoading } = useCajaActiva(CAJA_NOMBRE);
  const [aperturaId, setAperturaId]   = useState<number | null>(null);
  const [mostrarCierre, setMostrarCierre] = useState(false);

  // sync apertura
  const [synced, setSynced] = useState(false);
  if (cajaActiva && !synced) { setAperturaId(cajaActiva.id); setSynced(true); }

  // ── POS ──────────────────────────────────────────────────────────────────
  const [inputVal, setInputVal]           = useState('');
  const [notFound, setNotFound]           = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGrid, setShowGrid]           = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDrop, setShowClienteDrop] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteObj, setClienteObj] = useState<ICliente | null>(null);
  const [descGlobalInput, setDescGlobalInput] = useState('');
  const [receipt, setReceipt]             = useState<any>(null);

  // ── Ventas en pausa ──────────────────────────────────────────────────────
  const { carts: pausedCarts, pause: pauseCart, restore: restoreCart, remove: removeCart } = usePausedCartsStore();
  const [showPaused, setShowPaused]         = useState(false);

  // ── Panel mode ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'cart' | 'payment'>('cart');

  // ── Payment state ────────────────────────────────────────────────────────
  const [pagos, setPagos]     = useState<{ metodo: MetodoPago; monto: number }[]>([]);
  const [usarNCF, setUsarNCF] = useState(false);
  const [tipoNCF, setTipoNCF] = useState<TipoNCF>('02');
  const [notas, setNotas]       = useState('');
  const [promoCodigo, setPromoCodigo] = useState('');
  const [promoDescuento, setPromoDescuento] = useState(0);
  const [promoNombre, setPromoNombre]   = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [showNCF, setShowNCF] = useState(false);
  // Simple vs mixed payment
  const [pagoMixto, setPagoMixto]               = useState(false);
  const [metodoPago, setMetodoPago]             = useState<MetodoPago>('EFECTIVO');
  const [efectivoRecibido, setEfectivoRecibido] = useState<number | ''>('');
  // Gift card
  const [gcCodigo, setGcCodigo]       = useState('');
  const [gcData, setGcData]           = useState<ITarjetaRegalo | null>(null);
  const [gcLoading, setGcLoading]     = useState(false);
  const [gcError, setGcError]         = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Re-enfocar el escáner al volver al modo carrito o cerrar el recibo
  useEffect(() => {
    if (mode === 'cart' && !receipt) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mode, receipt]);

  // ── Artículos grid ────────────────────────────────────────────────────────
  const { data: articulosData } = useQuery({
    queryKey: ['pos-articulos'],
    queryFn:  () => inventarioService.getAll(1, 60),
    enabled:  showGrid,
  });
  const articulos = articulosData?.data ?? [];

  // ── Búsqueda por nombre ───────────────────────────────────────────────────
  const { data: sugerenciasData } = useQuery({
    queryKey: ['pos-search', inputVal],
    queryFn:  () => inventarioService.getAll(1, 8, inputVal.trim()),
    enabled:  inputVal.trim().length >= 2 && showSuggestions,
    placeholderData: (prev) => prev,
  });
  const sugerencias: IArticulo[] = sugerenciasData?.data ?? [];

  // ── Clientes ──────────────────────────────────────────────────────────────
  const { data: clientesData } = useQuery({
    queryKey: ['pos-clientes', clienteSearch],
    queryFn:  () => clientesService.getAll(1, 8, clienteSearch),
    enabled:  clienteSearch.length >= 2,
  });
  const clientes = clientesData?.data ?? [];

  // Inicializar pagos al entrar a modo pago
  useEffect(() => {
    if (mode === 'payment') {
      setPagoMixto(false);
      setMetodoPago('EFECTIVO');
      setEfectivoRecibido('');
      setPagos([{ metodo: 'EFECTIVO', monto: total() }]);
      setGcCodigo(''); setGcData(null); setGcError('');
      setPromoCodigo(''); setPromoDescuento(0); setPromoNombre('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Registrar venta ───────────────────────────────────────────────────────
  const registrar = useMutation({
    mutationFn: (payload: Parameters<typeof ventasService.create>[0]) =>
      ventasService.create(payload),
    onSuccess: (venta) => {
      clearCart();
      setMode('cart');
      setPagos([]);
      setPagoMixto(false);
      setMetodoPago('EFECTIVO');
      setEfectivoRecibido('');
      setGcCodigo(''); setGcData(null); setGcError('');
      setNotas('');
      setUsarNCF(false);
      setReceipt(venta);
      toast.success(`Venta registrada — Factura F-${String(venta.id).padStart(6, '0')}`);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Error al registrar la venta');
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleInputKey = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputVal('');
      return;
    }
    if (e.key !== 'Enter' || !inputVal.trim()) return;
    setNotFound(false);
    // 1. Try barcode first
    try {
      const art = await inventarioService.getByBarcode(inputVal.trim());
      addItem(art);
      setInputVal('');
      setShowSuggestions(false);
      return;
    } catch {
      // not a barcode match — fall through to name search
    }
    // 2. If there's exactly 1 suggestion, add it
    if (sugerencias.length === 1) {
      addItem(sugerencias[0]);
      setInputVal('');
      setShowSuggestions(false);
    } else if (sugerencias.length > 1) {
      // Open dropdown so user can pick
      setShowSuggestions(true);
    } else {
      setNotFound(true);
      setTimeout(() => setNotFound(false), 2000);
    }
  }, [inputVal, addItem, sugerencias]);

  const handleSelectCliente = (c: ICliente) => {
    setCliente(c.id);
    setClienteNombre(c.nombre);
    setClienteObj(c);
    setShowClienteDrop(false);
    setClienteSearch('');
    // Aplicar descuento automático del cliente como descuento global
    const desc = Number(c.descuentoCliente ?? 0);
    if (desc > 0) {
      setDescuentoGlobal(desc);
      toast.info(`Descuento del ${desc}% aplicado — cliente ${c.nombre}`);
    }
  };

  const handleDescuentoGlobal = () => {
    const val = parseFloat(descGlobalInput);
    if (!isNaN(val) && val >= 0) setDescuentoGlobal(val);
    setDescGlobalInput('');
  };

  const totalFinal   = Math.max(0, total() - promoDescuento);
  const totalPagado  = pagos.reduce((s, p) => s + p.monto, 0);
  const restante     = Math.max(0, totalFinal - totalPagado);
  const efectivoPago = pagos.find((p) => p.metodo === 'EFECTIVO')?.monto ?? 0;
  const cambio       = efectivoPago > 0 ? Math.max(0, totalPagado - totalFinal) : 0;
  const cambioSimple = metodoPago === 'EFECTIVO' && efectivoRecibido !== ''
    ? Math.max(0, Number(efectivoRecibido) - totalFinal) : 0;
  const gcValido = gcData?.estado === 'ACTIVA' && Number(gcData?.saldoActual ?? 0) >= totalFinal;
  const creditoDisponible = clienteObj
    ? Number(clienteObj.limiteCredito) - Number(clienteObj.saldo)
    : 0;
  const puedeConfirmar = items.length > 0 && (
    pagoMixto
      ? restante <= 0.01
      : metodoPago === 'EFECTIVO'
        ? (efectivoRecibido !== '' && Number(efectivoRecibido) >= totalFinal)
        : metodoPago === 'TARJETA_REGALO'
          ? gcValido
          : metodoPago === 'CREDITO'
            ? (!!clienteObj && creditoDisponible >= totalFinal)
            : true
  );

  const handleSetMonto = (metodo: MetodoPago, valor: string) => {
    const monto = parseFloat(valor) || 0;
    setPagos((prev) => {
      const sin = prev.filter((p) => p.metodo !== metodo);
      if (monto <= 0) return sin;
      return [...sin, { metodo, monto }];
    });
  };

  const getMonto = (metodo: MetodoPago) =>
    pagos.find((p) => p.metodo === metodo)?.monto ?? 0;

  const handleBuscarTarjeta = async () => {
    if (!gcCodigo.trim()) return;
    setGcLoading(true); setGcError(''); setGcData(null);
    try {
      const card = await tarjetasRegaloService.getByCodigo(gcCodigo.trim().toUpperCase());
      setGcData(card);
      if (card.estado !== 'ACTIVA') setGcError(`Tarjeta ${card.estado.toLowerCase()}`);
      else if (Number(card.saldoActual) < totalFinal) setGcError(`Saldo insuficiente (${formatCurrency(Number(card.saldoActual))} disponible)`);
    } catch {
      setGcError('Tarjeta no encontrada');
    } finally {
      setGcLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!puedeConfirmar || registrar.isPending) return;
    if (usarNCF && !clienteId) {
      toast.error('Para emitir comprobante fiscal se requiere seleccionar un cliente');
      return;
    }
    let pagosActivos: { metodo: MetodoPago; monto: number }[];
    if (pagoMixto) {
      pagosActivos = pagos.filter((p) => p.monto > 0);
    } else {
      pagosActivos = [{ metodo: metodoPago, monto: totalFinal }];
    }
    const metodoPrincipal = pagosActivos.length === 1
      ? pagosActivos[0].metodo
      : pagosActivos.reduce((a, b) => a.monto >= b.monto ? a : b).metodo;

    // Si pago con tarjeta de regalo: primero debitar, luego registrar venta
    if (!pagoMixto && metodoPago === 'TARJETA_REGALO' && gcData) {
      try {
        await tarjetasRegaloService.usar(gcData.id, {
          monto: totalFinal,
          notas: notas || `Venta POS`,
        });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Error al procesar tarjeta de regalo');
        return;
      }
    }

    registrar.mutate({
      clienteId:  clienteId ?? undefined,
      metodoPago: metodoPrincipal,
      pagos:      pagosActivos.length > 1 ? pagosActivos : undefined,
      descuento:  descuentoGlobal,
      usarNCF,
      tipoNCF:    usarNCF ? tipoNCF : undefined,
      notas:      notas || undefined,
      detalles: items.map((i) => ({
        articuloId:     i.articulo.id,
        cantidad:       i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento:      i.descuento,
      })),
    } as any);
  };

  const handlePausarVenta = () => {
    if (items.length === 0) return;
    const count = pausedCarts.length + 1;
    pauseCart({
      label:           `Venta ${count}`,
      items:           [...items],
      clienteId,
      clienteNombre,
      descuentoGlobal,
      total:           totalFinal,
    });
    clearCart();
    setClienteNombre('');
    setClienteObj(null);
    toast.success('Venta pausada — puedes retomar cuando quieras');
  };

  const handleRetomarVenta = (id: string) => {
    if (items.length > 0 && !confirm('El carrito actual se limpiará. ¿Continuar?')) return;
    const cart = restoreCart(id);
    if (!cart) return;
    clearCart();
    setClienteNombre(cart.clienteNombre);
    setCliente(cart.clienteId);
    setDescuentoGlobal(cart.descuentoGlobal);
    // Restaurar todos los ítems de una sola vez
    useCartStore.setState({
      items:           [...cart.items],
      clienteId:       cart.clienteId,
      descuentoGlobal: cart.descuentoGlobal,
    });
    setShowPaused(false);
    toast.success(`Venta "${cart.label}" retomada`);
  };

  // ── Guard: caja ───────────────────────────────────────────────────────────
  if (cajaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!aperturaId) {
    return <AperturaCaja cajaNombre={CAJA_NOMBRE} onAbierta={(id) => { setAperturaId(id); setSynced(false); }} />;
  }
  if (mostrarCierre && cajaActiva) {
    return (
      <div className="p-6">
        <CierreCaja
          aperturaId={cajaActiva.id}
          montoApertura={cajaActiva.montoApertura}
          fechaApertura={cajaActiva.fechaApertura}
          cajaNombre={CAJA_NOMBRE}
          onCerrada={() => { setMostrarCierre(false); setAperturaId(null); setSynced(false); }}
          onVolver={() => setMostrarCierre(false)}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] -m-4 lg:-m-6 overflow-hidden">

        {/* ═══ Panel izquierdo: búsqueda + carrito ══════════════════════════ */}
        <div className={`flex-col bg-navy-50 overflow-hidden flex-1 ${mode === 'payment' ? 'hidden md:flex' : 'flex'}`}>

          {/* Barra búsqueda */}
          <div className="flex items-center gap-2 p-3 bg-white border-b border-navy-200 shrink-0">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                ref={inputRef}
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setNotFound(false);
                  setShowSuggestions(e.target.value.trim().length >= 2);
                }}
                onKeyDown={handleInputKey}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => { if (inputVal.trim().length >= 2) setShowSuggestions(true); }}
                placeholder="Código de barras o nombre del artículo…"
                className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                  notFound ? 'border-red-400 bg-red-50' : 'border-navy-200'
                }`}
                autoFocus
              />
              {notFound && (
                <p className="absolute left-0 top-full mt-0.5 text-xs text-red-500">
                  Artículo no encontrado
                </p>
              )}
              {/* Dropdown de sugerencias */}
              {showSuggestions && sugerencias.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-navy-200 rounded-lg shadow-float z-50 overflow-hidden">
                  {sugerencias.map((a) => (
                    <button
                      key={a.id}
                      onMouseDown={() => {
                        addItem(a);
                        setInputVal('');
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50 text-left transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-800 truncate">{a.nombre}</p>
                        {a.categoria && (
                          <p className="text-[10px] text-navy-400 truncate">{typeof a.categoria === 'object' ? (a.categoria as any).nombre : a.categoria}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary-600">{formatCurrency(a.precioVenta)}</p>
                        {a.cantidad !== null && (
                          <p className="text-[10px] text-navy-400">Stock: {a.cantidad}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowGrid((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showGrid
                  ? 'bg-primary-50 border-primary-400 text-primary-600'
                  : 'border-navy-200 text-navy-500 hover:border-navy-300'
              }`}
            >
              <Grid3X3 size={15} />
              <span className="hidden sm:inline">Cuadrícula</span>
            </button>
          </div>

          {/* Grid de productos */}
          {showGrid && (
            <div className="bg-white border-b border-navy-200 p-3 grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2 max-h-52 overflow-y-auto shrink-0">
              {articulos.map((a: IArticulo) => (
                <button
                  key={a.id}
                  onClick={() => addItem(a)}
                  className="text-left p-2 border border-navy-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <p className="text-xs font-medium truncate text-navy-700">{a.nombre}</p>
                  <p className="text-xs text-primary-600 font-bold mt-0.5">{formatCurrency(a.precioVenta)}</p>
                  {a.cantidad !== null && (
                    <p className="text-[10px] text-navy-400">Stock: {a.cantidad}</p>
                  )}
                </button>
              ))}
              {articulos.length === 0 && (
                <p className="col-span-full text-center text-sm text-navy-400 py-4">Cargando…</p>
              )}
            </div>
          )}

          {/* Carrito */}
          <div className="flex-1 overflow-auto pb-24 md:pb-0">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ShoppingCart size={52} className="text-navy-200 mx-auto mb-3" />
                  <p className="text-navy-400 font-semibold text-lg">Carrito vacío</p>
                  <p className="text-navy-300 text-sm mt-1">Escanea un código o usa la cuadrícula</p>
                </div>
              </div>
            ) : (
              <table className="w-full min-w-[480px]">
                <thead className="sticky top-0 bg-white border-b border-navy-100/40 z-10">
                  <tr>
                    <th className="table-header text-left pl-4">Artículo</th>
                    <th className="table-header text-right">Precio</th>
                    <th className="table-header text-center">Cant.</th>
                    <th className="table-header text-center w-20">Desc.%</th>
                    <th className="table-header text-right pr-4">Total</th>
                    <th className="table-header w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.articulo.id} className="hover:bg-white/80 group border-b border-navy-100/40">
                      <td className="table-cell pl-4">
                        <p className="font-medium text-navy-800 text-sm">{item.articulo.nombre}</p>
                        {item.articulo.categoria && (
                          <p className="text-[10px] text-navy-400">{item.articulo.categoria.nombre}</p>
                        )}
                      </td>
                      <td className="table-cell text-right text-navy-400 text-sm">{formatCurrency(item.precioUnitario)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => item.cantidad > 1
                              ? updateCantidad(item.articulo.id, item.cantidad - 1)
                              : removeItem(item.articulo.id)}
                            className="w-6 h-6 rounded-md bg-navy-50 hover:bg-navy-200 flex items-center justify-center text-navy-500 transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => { const v = parseInt(e.target.value); if (v > 0) updateCantidad(item.articulo.id, v); }}
                            className="w-9 text-center text-sm border border-navy-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          />
                          <button
                            onClick={() => updateCantidad(item.articulo.id, item.cantidad + 1)}
                            className="w-6 h-6 rounded-md bg-navy-50 hover:bg-navy-200 flex items-center justify-center text-navy-500 transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="table-cell">
                        <input
                          type="number"
                          min={0} max={100}
                          value={item.descuento}
                          onChange={(e) => updateDescuento(item.articulo.id, Number(e.target.value))}
                          className="w-14 mx-auto block text-center text-sm border border-navy-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
                        />
                      </td>
                      <td className="table-cell text-right font-semibold text-navy-800 pr-4 text-sm">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="table-cell pr-2">
                        <button
                          onClick={() => removeItem(item.articulo.id)}
                          className="text-navy-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ═══ Panel derecho ════════════════════════════════════════════════ */}
        <div className={`bg-white border-l border-navy-100/40 flex flex-col shadow-sm ${
          mode === 'payment'
            ? 'flex w-full md:w-72 xl:w-80'
            : 'hidden md:flex md:w-72 xl:w-80'
        }`}>

          {/* Header del panel */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-navy-100/40 shrink-0">
            {mode === 'payment' ? (
              <button
                onClick={() => setMode('cart')}
                className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-800 transition-colors"
              >
                <ArrowLeft size={15} /> Volver
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-navy-400 uppercase tracking-wide">{CAJA_NOMBRE}</span>
                {pausedCarts.length > 0 && (
                  <button
                    onClick={() => setShowPaused((v) => !v)}
                    className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-700 transition-colors font-medium"
                  >
                    <Clock size={12} />
                    <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      {pausedCarts.length}
                    </span>
                  </button>
                )}
              </div>
            )}
            {mode === 'cart' && (
              <button
                onClick={() => setMostrarCierre(true)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                <Lock size={13} /> Cerrar caja
              </button>
            )}
            {mode === 'payment' && (
              <span className="text-xs font-semibold text-primary-600">Procesar pago</span>
            )}
          </div>

          {/* Ventas pausadas */}
          {showPaused && mode === 'cart' && pausedCarts.length > 0 && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 space-y-1.5 shrink-0">
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <PauseCircle size={13} /> Ventas en pausa
              </p>
              {pausedCarts.map((cart) => (
                <div key={cart.id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-navy-800 truncate">{cart.label}</p>
                    <p className="text-[10px] text-navy-400">
                      {cart.items.length} art. · {formatCurrency(cart.total)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRetomarVenta(cart.id)}
                    className="text-emerald-600 hover:text-emerald-800 transition-colors p-1"
                    title="Retomar"
                  >
                    <PlayCircle size={16} />
                  </button>
                  <button
                    onClick={() => removeCart(cart.id)}
                    className="text-navy-300 hover:text-red-400 transition-colors p-1"
                    title="Eliminar"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── MODO CARRITO ─────────────────────────────────────────────── */}
          {mode === 'cart' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Cliente */}
                <div className="relative">
                  {clienteNombre ? (
                    <div className="flex items-center gap-2 border border-primary-300 rounded-xl px-3 py-2.5 bg-primary-50">
                      <UserPlus size={15} className="text-primary-500 shrink-0" />
                      <span className="text-sm font-medium text-primary-700 truncate flex-1">{clienteNombre}</span>
                      <button onClick={() => { setCliente(null); setClienteNombre(''); setClienteObj(null); }} className="text-primary-400 hover:text-red-500 shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex items-center gap-2 border border-navy-200 rounded-xl px-3 py-2.5 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all">
                        <UserPlus size={15} className="text-navy-300 shrink-0" />
                        <input
                          value={clienteSearch}
                          onChange={(e) => { setClienteSearch(e.target.value); setShowClienteDrop(true); }}
                          onFocus={() => setShowClienteDrop(true)}
                          placeholder="Buscar cliente (opcional)"
                          className="flex-1 text-sm outline-none bg-transparent placeholder-navy-300"
                        />
                      </div>
                      {showClienteDrop && clientes.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 bg-white border border-navy-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {clientes.map((c: ICliente) => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectCliente(c)}
                              className="w-full text-left px-3 py-2.5 hover:bg-primary-50 text-sm border-b border-navy-100/40 last:border-0 transition-colors"
                            >
                              <p className="font-medium text-navy-800">{c.nombre}</p>
                              {c.telefono && <p className="text-xs text-navy-400">{c.telefono}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Resumen de precios */}
                <div className="bg-navy-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-sm text-navy-400">
                    <span>Subtotal</span>
                    <span className="font-medium text-navy-700">{formatCurrency(subtotal())}</span>
                  </div>

                  {/* Descuento global */}
                  <div className="flex justify-between items-center text-sm text-navy-400">
                    <span>Descuento (RD$)</span>
                    <input
                      type="number"
                      min={0}
                      value={descGlobalInput}
                      onChange={(e) => setDescGlobalInput(e.target.value)}
                      onBlur={handleDescuentoGlobal}
                      onKeyDown={(e) => e.key === 'Enter' && handleDescuentoGlobal()}
                      className="w-24 border border-navy-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
                      placeholder="0.00"
                    />
                  </div>

                  {descuentoGlobal > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Aplicado</span>
                      <span>-{formatCurrency(descuentoGlobal)}</span>
                    </div>
                  )}

                  <div className="border-t border-navy-200 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-navy-800">Total</span>
                    <span className="text-xl font-bold text-primary-600">{formatCurrency(totalFinal)}</span>
                  </div>
                </div>

                {/* Resumen artículos */}
                {items.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">
                      {items.length} artículo{items.length !== 1 ? 's' : ''}
                    </p>
                    {items.slice(0, 4).map((item) => (
                      <div key={item.articulo.id} className="flex justify-between text-xs">
                        <span className="text-navy-400 truncate max-w-[60%]">{item.cantidad}× {item.articulo.nombre}</span>
                        <span className="text-navy-700 font-medium shrink-0">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                    {items.length > 4 && (
                      <p className="text-xs text-navy-300">+{items.length - 4} más…</p>
                    )}
                  </div>
                )}
              </div>

              {/* Botones acción */}
              <div className="p-4 border-t border-navy-100/40 space-y-2 shrink-0">
                <button
                  onClick={() => setMode('payment')}
                  disabled={items.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:bg-navy-200 disabled:text-navy-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  <ShoppingCart size={16} />
                  {items.length > 0 ? `Cobrar ${formatCurrency(totalFinal)}` : 'Sin artículos'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handlePausarVenta}
                    disabled={items.length === 0}
                    title="Pausar esta venta y atender otra"
                    className="flex-1 flex items-center justify-center gap-1.5 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-30 text-amber-600 py-2 rounded-xl transition-colors text-xs font-medium"
                  >
                    <PauseCircle size={13} /> Pausar
                  </button>
                  <button
                    onClick={clearCart}
                    disabled={items.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-navy-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 text-navy-400 py-2 rounded-xl transition-colors text-xs"
                  >
                    <Trash2 size={13} /> Limpiar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── MODO PAGO ────────────────────────────────────────────────── */}
          {mode === 'payment' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Total a cobrar */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-[12px] p-4 text-white">
                  <p className="text-xs opacity-75 mb-1">Total a cobrar</p>
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalFinal)}</p>
                  {descuentoGlobal > 0 && (
                    <p className="text-xs opacity-60 mt-1">Desc.: {formatCurrency(descuentoGlobal)}</p>
                  )}
                </div>

                {/* ── PAGO SIMPLE ── */}
                {!pagoMixto && (
                  <div>
                    <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">Forma de pago</p>
                    <div className="grid grid-cols-3 gap-2">
                      {METODOS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setMetodoPago(m.id);
                            setGcData(null); setGcCodigo(''); setGcError('');
                            if (m.id !== 'EFECTIVO') {
                              setEfectivoRecibido('');
                              if (m.id !== 'TARJETA_REGALO') {
                                setPagos([{ metodo: m.id, monto: totalFinal }]);
                              }
                            } else {
                              setPagos([{ metodo: 'EFECTIVO', monto: totalFinal }]);
                            }
                          }}
                          className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                            metodoPago === m.id
                              ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white border-primary-500 shadow-sm'
                              : 'bg-navy-50 text-navy-500 border-transparent hover:bg-navy-100'
                          }`}
                        >
                          {m.icon}
                          <span className="text-xs">{m.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Efectivo: cash input */}
                    {metodoPago === 'EFECTIVO' && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-navy-600">Efectivo recibido</p>
                        <input
                          type="number"
                          value={efectivoRecibido}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : Number(e.target.value);
                            setEfectivoRecibido(v);
                            setPagos([{ metodo: 'EFECTIVO', monto: v === '' ? totalFinal : Number(v) }]);
                          }}
                          className="w-full bg-navy-50 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                          placeholder="0.00"
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => { setEfectivoRecibido(totalFinal); setPagos([{ metodo: 'EFECTIVO', monto: totalFinal }]); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg border-2 border-emerald-400 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                          >
                            Exacto
                          </button>
                          {BILLETES.filter((b) => b >= totalFinal).slice(0, 3).map((b) => (
                            <button key={b}
                              onClick={() => { setEfectivoRecibido(b); setPagos([{ metodo: 'EFECTIVO', monto: b }]); }}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                efectivoRecibido === b ? 'bg-primary-500 text-white border-primary-500' : 'bg-navy-50 text-navy-500 border-transparent hover:bg-primary-50'
                              }`}
                            >
                              {formatCurrency(b)}
                            </button>
                          ))}
                        </div>
                        {efectivoRecibido !== '' && Number(efectivoRecibido) >= totalFinal && (
                          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-3 text-center">
                            <p className="text-xs text-emerald-600 font-medium mb-0.5">Cambio</p>
                            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(cambioSimple)}</p>
                          </div>
                        )}
                        {efectivoRecibido !== '' && Number(efectivoRecibido) < totalFinal && (
                          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
                            <p className="text-xs text-red-500">Faltan {formatCurrency(totalFinal - Number(efectivoRecibido))}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tarjeta de regalo: lookup */}
                    {metodoPago === 'TARJETA_REGALO' && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-navy-600">Código de tarjeta</p>
                        <div className="flex gap-2">
                          <input
                            value={gcCodigo}
                            onChange={(e) => { setGcCodigo(e.target.value.toUpperCase()); setGcData(null); setGcError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleBuscarTarjeta()}
                            className="input-field font-mono text-sm flex-1 uppercase"
                            placeholder="GC-XXXX-XXXX"
                            autoFocus
                          />
                          <button
                            onClick={handleBuscarTarjeta}
                            disabled={gcLoading || !gcCodigo.trim()}
                            className="bg-gradient-to-br from-primary-600 to-primary-500 text-white px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                          >
                            {gcLoading ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                          </button>
                        </div>
                        {gcError && (
                          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
                            <p className="text-xs text-red-500">{gcError}</p>
                          </div>
                        )}
                        {gcData && !gcError && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono text-xs text-emerald-700 font-semibold">{gcData.codigo}</p>
                                <p className="text-[10px] text-emerald-600 mt-0.5">Saldo disponible</p>
                              </div>
                              <p className="text-xl font-bold text-emerald-700">{formatCurrency(Number(gcData.saldoActual))}</p>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                              <CheckCircle size={13} /> Listo para cobrar {formatCurrency(totalFinal)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CREDITO: show client credit info */}
                    {metodoPago === 'CREDITO' && (() => {
                      const disponible = clienteObj
                        ? Number(clienteObj.limiteCredito) - Number(clienteObj.saldo)
                        : null;
                      const sinCredito = disponible !== null && disponible < totalFinal;
                      return clienteObj ? (
                        <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${sinCredito ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                          <p className="font-semibold mb-1">
                            {sinCredito ? 'Crédito insuficiente' : <span className="flex items-center gap-1"><CheckCircle size={14} /> Crédito disponible</span>}
                          </p>
                          <div className="flex justify-between text-xs">
                            <span>Límite:</span><span>{formatCurrency(Number(clienteObj.limiteCredito))}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Deuda actual:</span><span>{formatCurrency(Number(clienteObj.saldo))}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold mt-0.5">
                            <span>Disponible:</span><span>{formatCurrency(disponible!)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 text-sm">
                          Selecciona un cliente para vender a crédito
                        </div>
                      );
                    })()}

                    {/* No-cash (non-gift-card, non-credit): listo */}
                    {metodoPago !== 'EFECTIVO' && metodoPago !== 'TARJETA_REGALO' && metodoPago !== 'CREDITO' && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 text-emerald-700 text-sm font-semibold">
                        <CheckCircle size={15} /> Listo para cobrar
                      </div>
                    )}

                    {/* Toggle mixto */}
                    <button
                      onClick={() => {
                        setPagoMixto(true);
                        if (metodoPago === 'EFECTIVO') {
                          setPagos([{ metodo: 'EFECTIVO', monto: efectivoRecibido !== '' ? Number(efectivoRecibido) : 0 }]);
                        } else {
                          setPagos([{ metodo: metodoPago, monto: totalFinal }]);
                        }
                      }}
                      className="mt-3 w-full text-xs text-navy-400 hover:text-primary-600 text-center py-1 transition-colors"
                    >
                      Dividir entre varios métodos →
                    </button>
                  </div>
                )}

                {/* ── PAGO MIXTO ── */}
                {pagoMixto && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">Pago mixto</p>
                      <button
                        onClick={() => {
                          setPagoMixto(false);
                          setMetodoPago('EFECTIVO');
                          setEfectivoRecibido('');
                          setPagos([{ metodo: 'EFECTIVO', monto: totalFinal }]);
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800 transition-colors"
                      >
                        ← Un solo método
                      </button>
                    </div>
                    <div className="space-y-2">
                      {METODOS.map((m) => {
                        const val = getMonto(m.id);
                        const activo = val > 0;
                        return (
                          <div key={m.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                            activo ? 'border-primary-300 bg-primary-50' : 'border-navy-200 bg-white'
                          }`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              activo ? 'bg-primary-500 text-white' : 'bg-navy-50 text-navy-400'
                            }`}>
                              <span className="scale-75 inline-flex">{m.icon}</span>
                            </div>
                            <span className={`text-xs font-medium flex-1 ${activo ? 'text-primary-700' : 'text-navy-400'}`}>
                              {m.label}
                            </span>
                            <input
                              type="number" min={0} step={0.01}
                              value={val || ''}
                              onChange={(e) => handleSetMonto(m.id, e.target.value)}
                              placeholder="0.00"
                              className="w-24 text-right text-sm font-semibold border border-navy-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        onClick={() => handleSetMonto('EFECTIVO', String(restante > 0 ? restante : totalFinal))}
                        className="text-xs px-2.5 py-1.5 rounded-lg border-2 border-emerald-400 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                      >
                        Efectivo exacto
                      </button>
                      {BILLETES.filter((b) => b >= (restante > 0 ? restante : totalFinal)).slice(0, 2).map((b) => (
                        <button key={b}
                          onClick={() => handleSetMonto('EFECTIVO', String(b))}
                          className="text-xs px-2.5 py-1.5 rounded-lg border bg-navy-50 text-navy-500 border-transparent hover:bg-primary-50 transition-colors"
                        >
                          {formatCurrency(b)}
                        </button>
                      ))}
                    </div>
                    {restante > 0.01 && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-xs text-red-500 font-medium">Falta</p>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(restante)}</p>
                      </div>
                    )}
                    {cambio > 0.01 && (
                      <div className="mt-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-3 text-center">
                        <p className="text-xs text-emerald-600 font-medium mb-0.5">Cambio a devolver</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(cambio)}</p>
                      </div>
                    )}
                    {restante <= 0.01 && cambio <= 0.01 && totalPagado > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 text-emerald-600 text-sm font-semibold">
                        <CheckCircle size={16} /> Pago completo
                      </div>
                    )}
                  </div>
                )}

                {/* NCF */}
                <div className="border border-navy-100/40 rounded-[12px] overflow-hidden">
                  <button
                    onClick={() => setShowNCF((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-navy-50 transition-colors"
                  >
                    <span className="font-medium text-navy-700">Comprobante Fiscal (NCF)</span>
                    <div className="flex items-center gap-2">
                      {usarNCF && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{tipoNCF}</span>}
                      <ChevronDown size={14} className={`text-navy-400 transition-transform ${showNCF ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {showNCF && (
                    <div className="px-4 pb-3 border-t border-navy-100/40">
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-sm text-navy-500">Emitir comprobante</span>
                        <button
                          onClick={() => setUsarNCF((v) => !v)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${usarNCF ? 'bg-primary-500' : 'bg-navy-300'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${usarNCF ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {usarNCF && (
                        <div className="space-y-1.5 mt-1">
                          {TIPOS_NCF.map((t) => (
                            <label key={t.id} onClick={() => setTipoNCF(t.id)} className="flex items-center gap-2.5 cursor-pointer group">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                                tipoNCF === t.id ? 'border-primary-500 bg-primary-500' : 'border-navy-200 group-hover:border-primary-300'
                              }`}>
                                {tipoNCF === t.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <span className="text-xs text-navy-500">{t.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Código de promoción */}
                <div>
                  <label className="text-xs font-semibold text-navy-400 uppercase tracking-wide block mb-1.5">
                    Código de descuento
                  </label>
                  {promoDescuento > 0 ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-700">{promoCodigo} — {promoNombre}</p>
                        <p className="text-xs text-emerald-600">-{formatCurrency(promoDescuento)} aplicado</p>
                      </div>
                      <button onClick={() => { setPromoDescuento(0); setPromoCodigo(''); setPromoNombre(''); }}
                        className="text-emerald-500 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={promoCodigo}
                        onChange={(e) => setPromoCodigo(e.target.value.toUpperCase())}
                        placeholder="PROMO2024"
                        className="flex-1 border border-navy-200 rounded-xl px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                      <button
                        disabled={promoLoading || !promoCodigo.trim()}
                        onClick={async () => {
                          if (!promoCodigo.trim()) return;
                          setPromoLoading(true);
                          try {
                            const res = await promocionesService.validar(promoCodigo.trim(), total());
                            setPromoDescuento(res.descuentoMonto);
                            setPromoNombre(res.promocion.nombre);
                            toast.success(`Descuento de ${formatCurrency(res.descuentoMonto)} aplicado`);
                          } catch (e: unknown) {
                            toast.error(e instanceof Error ? e.message : 'Código inválido');
                          } finally { setPromoLoading(false); }
                        }}
                        className="px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        {promoLoading ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Notas */}
                <div>
                  <label className="text-xs font-semibold text-navy-400 uppercase tracking-wide block mb-1.5">
                    Notas (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full border border-navy-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                    placeholder="Observaciones…"
                  />
                </div>
              </div>

              {/* Confirmar */}
              <div className="p-4 border-t border-navy-100/40 shrink-0 space-y-2">
                {usarNCF && !clienteId && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                    Selecciona un cliente para emitir el comprobante fiscal
                  </p>
                )}
                <button
                  onClick={handleConfirmar}
                  disabled={!puedeConfirmar || registrar.isPending || (usarNCF && !clienteId)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-navy-200 disabled:text-navy-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {registrar.isPending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle size={16} />}
                  {registrar.isPending ? 'Procesando…' : `Confirmar ${formatCurrency(totalFinal)}`}
                </button>
                <button
                  onClick={() => setMode('cart')}
                  disabled={registrar.isPending}
                  className="w-full text-xs text-navy-400 hover:text-navy-500 py-1.5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom bar — only in cart mode on small screens */}
      {mode === 'cart' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-navy-200 px-4 py-3 z-30 shadow-[0_-4px_16px_0_rgb(24_28_28/0.08)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm text-navy-400">{items.length} artículo{items.length !== 1 ? 's' : ''}</span>
            <span className="text-2xl font-bold text-primary-600 font-display">{formatCurrency(totalFinal)}</span>
          </div>
          <button
            onClick={() => setMode('payment')}
            disabled={items.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary-600 to-primary-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm"
          >
            <ShoppingCart size={16} />
            {items.length > 0 ? `Cobrar ${formatCurrency(totalFinal)}` : 'Sin artículos'}
          </button>
        </div>
      )}

      {/* Recibo — autoPrint dispara window.print() automáticamente */}
      {receipt && <Receipt venta={receipt} onClose={() => setReceipt(null)} autoPrint />}
    </>
  );
}

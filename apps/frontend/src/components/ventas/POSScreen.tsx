'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { inventarioService }  from '@/services/inventario.service';
import { clientesService }    from '@/services/clientes.service';
import { ventasService }      from '@/services/ventas.service';
import { useCartStore }       from '@/store/cart.store';
import { usePausedCartsStore } from '@/store/pausedCarts.store';
import { useCajaActiva }      from '@/hooks/useVentas';
import { toast }              from '@/store/toast.store';
import { IArticulo, ICliente, IVenta } from '@pos/shared';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency }     from '@/lib/utils';
import { formatTiendaCajaLine } from '@/lib/select-display';
import { Select }             from '@/components/ui/Select';
import { nombreArticuloConUnidad } from '@/lib/format-articulo';
import { AperturaCaja }       from './AperturaCaja';
import { CierreCaja }         from './CierreCaja';
import { Receipt }            from './Receipt';
import { VentaModal }         from './VentaModal';
import { BarcodeCamera }      from '@/components/common/BarcodeCamera';
import {
  ShoppingCart, Grid3X3, Plus, Minus, Trash2,
  UserPlus, X, Search, Lock, ArrowLeft,
  Banknote, CreditCard, Smartphone, BookOpen,
  CheckCircle, ChevronDown, PauseCircle, PlayCircle, Clock,
  Gift, Loader2, Bike, Camera, FileText, Tag, AlertTriangle, Keyboard,
} from 'lucide-react';
import { tarjetasRegaloService, ITarjetaRegalo } from '@/services/tarjetas-regalo.service';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { useComprobantes } from '@/hooks/useComprobantes';
import { buildNcfPreview, parseNcfSequenceTail } from '@/lib/ncf';
import { useCajas } from '@/hooks/useCajas';
import { promocionesService } from '@/services/promociones.service';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { usePosKeyboardShortcuts } from '@/hooks/usePosKeyboardShortcuts';
import { usePosDraftPersistence } from '@/hooks/usePosDraftPersistence';
import { PosShortcutsHelp } from './PosShortcutsHelp';
import { POS_BILLETES_RD } from '@/lib/pos-keyboard-shortcuts';
import {
  POS_DRAFT_SCHEMA_VERSION,
  type PosDraftV1,
  removePosDraftStorage,
  rehydrateClienteFromDraftLite,
} from '@/lib/pos-draft-session';

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

const EMPTY_ARTICULOS: IArticulo[] = [];

// ─────────────────────────────────────────────────────────────────────────────
export function POSScreen() {
  const {
    items, addItem, removeItem, updateCantidad, updateDescuento,
    setCliente, clienteId, clearCart, subtotal, total, descuentoGlobal,
    setDescuentoGlobal,
  } = useCartStore();

  // ── Config + caja (por sucursal; admin elige entre todas) ─────────────────
  const { data: cfg } = useConfiguracion();
  const { data: comprobantes = [] } = useComprobantes();
  const user    = useAuthStore((s) => s.user);
  const platformTenantId = useAuthStore((s) => s.platformTenantId);
  const isAdmin = user?.rol === 'admin';

  const effectiveTenantId = useMemo(() => {
    if (!user) return null;
    if (user.rol === 'plataforma') return platformTenantId ?? null;
    return user.tenantId ?? 1;
  }, [user, platformTenantId]);

  const cajasQueryEnabled = !!user && (isAdmin || user.tiendaId != null);
  const { data: cajasLista = [], isLoading: cajasLoading } = useCajas(
    isAdmin ? undefined : user?.tiendaId,
    { enabled: cajasQueryEnabled }
  );

  const cajasElegibles = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return cajasLista;
    return cajasLista.filter((c) => c.tienda?.id === user.tiendaId);
  }, [user, isAdmin, cajasLista]);

  const [selectedCajaId, setSelectedCajaId] = useState<number | ''>('');

  useEffect(() => {
    if (!user || cajasLoading || !cajasQueryEnabled) return;
    if (!isAdmin && user.tiendaId == null) return;
    const eligible = cajasElegibles;
    if (eligible.length === 0) return;

    setSelectedCajaId((prev) => {
      if (prev !== '' && eligible.some((c) => c.id === prev)) return prev;

      if (typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem('pos_caja_seleccion');
          if (raw) {
            const { cajaId } = JSON.parse(raw) as { cajaId?: number };
            if (cajaId && eligible.some((c) => c.id === cajaId)) return cajaId;
          }
        } catch { /* ignore */ }
      }
      if (cfg?.cajaId && eligible.some((c) => c.id === cfg.cajaId)) return cfg.cajaId;
      return eligible[0].id;
    });
  }, [user, isAdmin, cajasLoading, cajasQueryEnabled, cajasElegibles, cfg?.cajaId]);

  const effectiveCajaId =
    selectedCajaId === '' ? undefined : Number(selectedCajaId);

  const effectiveNombre = useMemo(() => {
    const c = cajasElegibles.find((x) => x.id === effectiveCajaId);
    return c?.nombre ?? cfg?.caja?.nombre ?? cfg?.nombreCaja ?? 'CAJA 1';
  }, [cajasElegibles, effectiveCajaId, cfg?.caja?.nombre, cfg?.nombreCaja]);

  const effectiveTiendaId = useMemo(() => {
    const c = cajasElegibles.find((x) => x.id === effectiveCajaId);
    return c?.tienda?.id ?? cfg?.tiendaId ?? undefined;
  }, [cajasElegibles, effectiveCajaId, cfg?.tiendaId]);

  const handleSelectCajaPos = (id: number) => {
    setSelectedCajaId(id);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pos_caja_seleccion', JSON.stringify({ cajaId: id }));
    }
  };

  // ── Caja ─────────────────────────────────────────────────────────────────
  const {
    data: cajaActiva,
    isLoading: cajaLoading,
    isError: cajaActivaError,
    error: cajaActivaErrorObj,
    refetch: refetchCajaActiva,
    isFetching: cajaActivaFetching,
  } = useCajaActiva(
    effectiveNombre,
    effectiveCajaId
  );

  /** Solo con caja cerrada: admin o cajero con varias cajas en la sucursal. Oculto al tener sesión abierta. */
  const showCajaSelector = cajasElegibles.length > 1 && !cajaActiva;
  const [mostrarCierre, setMostrarCierre] = useState(false);
  /** Datos de la sesión al abrir “Cerrar caja” — no depender de `cajaActiva` tras el cierre (la query pasa a null) */
  const [cierreCtx, setCierreCtx] = useState<{
    aperturaId:    number;
    montoApertura: number;
    fechaApertura: string;
  } | null>(null);

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
  const [receipt, setReceipt]             = useState<IVenta | null>(null);
  const [ventaEditar, setVentaEditar]     = useState<IVenta | null>(null);
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
  // Delivery
  const [esDelivery, setEsDelivery]               = useState(false);
  const [deliveryCargo, setDeliveryCargo]         = useState<number | ''>('');
  const [deliveryDireccion, setDeliveryDireccion] = useState('');
  // Gift card
  const [gcCodigo, setGcCodigo]       = useState('');
  const [gcData, setGcData]           = useState<ITarjetaRegalo | null>(null);
  const [gcLoading, setGcLoading]     = useState(false);
  const [gcError, setGcError]         = useState('');

  const inputRef         = useRef<HTMLInputElement>(null);
  const clienteInputRef  = useRef<HTMLInputElement>(null);
  const cartRowRefs      = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const prevItemsLenRef  = useRef(0);
  const [cartLineFocus, setCartLineFocus] = useState(0);
  const [scanFlash,   setScanFlash]   = useState(false);
  const [showCamera,  setShowCamera]  = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  /** Evita que el efecto de “entrar a pago” pise estado restaurado desde sessionStorage. */
  const skipPaymentHydrationRef = useRef(false);

  const draftPersistenceEnabled =
    !!user &&
    !!cajaActiva &&
    !receipt &&
    effectiveTenantId != null &&
    effectiveTiendaId != null &&
    (!cajasQueryEnabled || !cajasLoading);

  const getPosDraftSnapshot = useCallback((): PosDraftV1 => ({
    v: POS_DRAFT_SCHEMA_VERSION,
    items,
    clienteId,
    descuentoGlobal,
    clienteNombre,
    clienteLite: clienteObj
      ? {
          id: clienteObj.id,
          nombre: clienteObj.nombre,
          limiteCredito: Number(clienteObj.limiteCredito ?? 0),
          saldo: Number(clienteObj.saldo ?? 0),
          descuentoCliente: clienteObj.descuentoCliente ?? null,
        }
      : null,
    selectedCajaId: effectiveCajaId,
    mode,
    pagos,
    usarNCF,
    tipoNCF,
    notas,
    promoCodigo,
    promoDescuento,
    promoNombre,
    showNCF,
    pagoMixto,
    metodoPago,
    efectivoRecibido,
    esDelivery,
    deliveryCargo,
    deliveryDireccion,
  }), [
    items,
    clienteId,
    descuentoGlobal,
    clienteNombre,
    clienteObj,
    effectiveCajaId,
    mode,
    pagos,
    usarNCF,
    tipoNCF,
    notas,
    promoCodigo,
    promoDescuento,
    promoNombre,
    showNCF,
    pagoMixto,
    metodoPago,
    efectivoRecibido,
    esDelivery,
    deliveryCargo,
    deliveryDireccion,
  ]);

  const onPosDraftScopeChange = useCallback(() => {
    clearCart();
    setClienteNombre('');
    setClienteObj(null);
    setMode('cart');
    setInputVal('');
    setPagos([]);
    setPagoMixto(false);
    setMetodoPago('EFECTIVO');
    setEfectivoRecibido('');
    setGcCodigo('');
    setGcData(null);
    setGcError('');
    setNotas('');
    setUsarNCF(false);
    setTipoNCF('02');
    setEsDelivery(false);
    setDeliveryCargo('');
    setDeliveryDireccion('');
    setPromoCodigo('');
    setPromoDescuento(0);
    setPromoNombre('');
    setShowNCF(false);
    setDescGlobalInput('');
  }, [clearCart]);

  const applyPosDraft = useCallback(
    (draft: PosDraftV1) => {
      if (draft.selectedCajaId != null && cajasElegibles.some((c) => c.id === draft.selectedCajaId)) {
        setSelectedCajaId(draft.selectedCajaId);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pos_caja_seleccion', JSON.stringify({ cajaId: draft.selectedCajaId }));
        }
      }
      useCartStore.setState({
        items: draft.items.map((row) => ({
          ...row,
          articulo: {
            ...row.articulo,
            categoria: { ...row.articulo.categoria },
          },
        })),
        clienteId: draft.clienteId,
        descuentoGlobal: draft.descuentoGlobal,
      });
      setClienteNombre(draft.clienteNombre);
      setClienteObj(draft.clienteLite ? rehydrateClienteFromDraftLite(draft.clienteLite) : null);
      setPagos(draft.pagos);
      setUsarNCF(draft.usarNCF);
      setTipoNCF(draft.tipoNCF);
      setNotas(draft.notas);
      setPromoCodigo(draft.promoCodigo);
      setPromoDescuento(draft.promoDescuento);
      setPromoNombre(draft.promoNombre);
      setShowNCF(draft.showNCF);
      setPagoMixto(draft.pagoMixto);
      setMetodoPago(draft.metodoPago);
      setEfectivoRecibido(draft.efectivoRecibido);
      setEsDelivery(draft.esDelivery);
      setDeliveryCargo(draft.deliveryCargo);
      setDeliveryDireccion(draft.deliveryDireccion);
      setGcCodigo('');
      setGcData(null);
      setGcError('');
      if (draft.mode === 'payment') {
        skipPaymentHydrationRef.current = true;
      }
      setMode(draft.mode);
    },
    [cajasElegibles],
  );

  const isCajaEligibleForDraft = useCallback(
    (cajaId: number) => cajasElegibles.some((c) => c.id === cajaId),
    [cajasElegibles],
  );

  const posDraftSaveRevision = useMemo(
    () => JSON.stringify(getPosDraftSnapshot()),
    [getPosDraftSnapshot],
  );

  usePosDraftPersistence({
    enabled: draftPersistenceEnabled,
    tenantId: effectiveTenantId,
    tiendaId: effectiveTiendaId,
    cartNonEmpty: items.length > 0,
    getSnapshot: getPosDraftSnapshot,
    applyDraft: applyPosDraft,
    onScopeChange: onPosDraftScopeChange,
    isCajaEligible: isCajaEligibleForDraft,
    saveRevision: posDraftSaveRevision,
  });

  // Re-enfocar el escáner al volver al modo carrito o cerrar el recibo
  useEffect(() => {
    if (mode === 'cart' && !receipt) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mode, receipt]);

  const tiposNcfDisponibles = useMemo(() => {
    const activos = new Set(
      comprobantes.filter((c) => c.activo).map((c) => c.tipo),
    );
    return TIPOS_NCF.filter((t) => activos.has(t.id));
  }, [comprobantes]);

  const comprobanteSeleccionado = useMemo(
    () => comprobantes.find((c) => c.tipo === tipoNCF && c.activo),
    [comprobantes, tipoNCF],
  );

  const proximoNcf = useMemo(() => {
    if (!comprobanteSeleccionado) return null;
    const seq = parseNcfSequenceTail(comprobanteSeleccionado.secuenciaActual);
    if (Number.isNaN(seq)) return comprobanteSeleccionado.secuenciaActual;
    return buildNcfPreview(comprobanteSeleccionado.series, comprobanteSeleccionado.tipo, seq);
  }, [comprobanteSeleccionado]);

  useEffect(() => {
    const def = cfg?.comprobanteDefecto as TipoNCF | undefined;
    if (def && TIPOS_NCF.some((t) => t.id === def)) {
      setTipoNCF(def);
    }
  }, [cfg?.comprobanteDefecto]);

  useEffect(() => {
    if (tiposNcfDisponibles.length === 0) return;
    if (!tiposNcfDisponibles.some((t) => t.id === tipoNCF)) {
      setTipoNCF(tiposNcfDisponibles[0].id);
    }
  }, [tiposNcfDisponibles, tipoNCF]);

  useEffect(() => {
    if (items.length === 0) {
      setCartLineFocus(0);
      prevItemsLenRef.current = 0;
      return;
    }
    if (items.length > prevItemsLenRef.current) {
      setCartLineFocus(items.length - 1);
    } else {
      setCartLineFocus((prev) => Math.min(prev, items.length - 1));
    }
    prevItemsLenRef.current = items.length;
  }, [items.length]);

  useEffect(() => {
    if (mode !== 'cart' || items.length === 0) return;
    cartRowRefs.current.get(cartLineFocus)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [cartLineFocus, mode, items.length]);

  // ── Lógica compartida: procesar código detectado (scanner físico o cámara) ─
  const handleCodigoDetectado = useCallback(async (codigo: string) => {
    setNotFound(false);
    try {
      const art = await inventarioService.getByBarcode(codigo);
      addItem(art);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 400);
      setShowCamera(false);
    } catch {
      setShowCamera(false);
      setInputVal(codigo);
      inputRef.current?.focus();
    }
  }, [addItem]);

  // ── Scanner físico global (USB / Bluetooth keyboard-wedge) ───────────────
  // Captura escaneos aunque el foco esté fuera del input de búsqueda
  useBarcodeScanner(
    async (codigo) => {
      if (mode !== 'cart' || !!receipt) return;
      handleCodigoDetectado(codigo);
    },
    { disabled: mode !== 'cart' || !!receipt || showCamera },
  );

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
  const sugerencias = useMemo(
    () => sugerenciasData?.data ?? EMPTY_ARTICULOS,
    [sugerenciasData?.data],
  );

  // ── Clientes ──────────────────────────────────────────────────────────────
  const { data: clientesData } = useQuery({
    queryKey: ['pos-clientes', clienteSearch],
    queryFn:  () => clientesService.getAll(1, 8, clienteSearch),
    enabled:  clienteSearch.length >= 2,
  });
  const clientes = clientesData?.data ?? [];

  // Inicializar pagos al entrar a modo pago (no pisar restauración desde sessionStorage)
  useEffect(() => {
    if (mode === 'payment') {
      if (skipPaymentHydrationRef.current) {
        skipPaymentHydrationRef.current = false;
        return;
      }
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
      if (effectiveTenantId != null && effectiveTiendaId != null) {
        removePosDraftStorage(effectiveTenantId, effectiveTiendaId);
      }
      clearCart();
      setMode('cart');
      setPagos([]);
      setPagoMixto(false);
      setMetodoPago('EFECTIVO');
      setEfectivoRecibido('');
      setGcCodigo(''); setGcData(null); setGcError('');
      setNotas('');
      setUsarNCF(false);
      setEsDelivery(false);
      setDeliveryCargo('');
      setDeliveryDireccion('');
      setReceipt(venta as IVenta);
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

  const cargoDelivery = esDelivery ? (deliveryCargo === '' ? 0 : Number(deliveryCargo)) : 0;
  const totalFinal   = Math.max(0, total() - promoDescuento + cargoDelivery);
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
  const deliveryMontoValido = !esDelivery || (deliveryCargo !== '' && Number(deliveryCargo) > 0);
  const puedeConfirmar = items.length > 0 && deliveryMontoValido && (
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
    if (usarNCF && !comprobanteSeleccionado) {
      toast.error(`No hay serie fiscal activa registrada para el tipo B${tipoNCF}`);
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
          notas: notas || `Venta Nexo`,
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
      efectivoRecibido: metodoPrincipal === 'EFECTIVO' && efectivoRecibido !== '' ? Number(efectivoRecibido) : undefined,
      esDelivery,
      deliveryCargo: cargoDelivery,
      deliveryDireccion: esDelivery && deliveryDireccion.trim() ? deliveryDireccion.trim() : undefined,
      cajaAperturaId: cajaActiva?.id,
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

  const applyMetodoPago = useCallback((m: MetodoPago) => {
    setMetodoPago(m);
    setGcData(null);
    setGcCodigo('');
    setGcError('');
    if (m !== 'EFECTIVO') {
      setEfectivoRecibido('');
      if (m !== 'TARJETA_REGALO') {
        setPagos([{ metodo: m, monto: totalFinal }]);
      }
    } else {
      setPagos([{ metodo: 'EFECTIVO', monto: totalFinal }]);
    }
  }, [totalFinal]);

  const selectPaymentMethodByIndex = useCallback((index: number) => {
    const m = METODOS[index]?.id;
    if (m) applyMetodoPago(m);
  }, [applyMetodoPago]);

  const handleLimpiarCarrito = useCallback(() => {
    if (items.length === 0) return;
    if (!confirm('¿Vaciar el carrito?')) return;
    clearCart();
    setClienteNombre('');
    setClienteObj(null);
    toast.info('Carrito vacío');
  }, [items.length, clearCart]);

  const navigateCartLine = useCallback((delta: number) => {
    if (items.length === 0) return;
    setCartLineFocus((prev) => Math.max(0, Math.min(items.length - 1, prev + delta)));
  }, [items.length]);

  const adjustFocusedLineQty = useCallback((delta: number) => {
    if (items.length === 0) return;
    const idx = Math.min(cartLineFocus, items.length - 1);
    const item = items[idx];
    if (!item) return;
    if (delta > 0) {
      updateCantidad(item.articulo.id, item.cantidad + delta);
    } else if (item.cantidad <= 1) {
      removeItem(item.articulo.id);
    } else {
      updateCantidad(item.articulo.id, item.cantidad - 1);
    }
  }, [items, cartLineFocus, updateCantidad, removeItem]);

  const removeFocusedCartLine = useCallback(() => {
    const item = items[cartLineFocus];
    if (!item) return;
    removeItem(item.articulo.id);
  }, [items, cartLineFocus, removeItem]);

  const applyQuickBill = useCallback((billIndex: number) => {
    const bill = POS_BILLETES_RD[billIndex];
    if (bill == null) return;
    const minMonto = pagoMixto ? (restante > 0.01 ? restante : totalFinal) : totalFinal;
    if (bill < minMonto) return;

    if (pagoMixto) {
      if (metodoPago !== 'EFECTIVO') applyMetodoPago('EFECTIVO');
      handleSetMonto('EFECTIVO', String(bill));
    } else {
      applyMetodoPago('EFECTIVO');
      setEfectivoRecibido(bill);
      setPagos([{ metodo: 'EFECTIVO', monto: bill }]);
    }
  }, [pagoMixto, restante, totalFinal, metodoPago, applyMetodoPago]);

  const billetesRapidos = useMemo(() => {
    const minMonto = pagoMixto ? (restante > 0.01 ? restante : totalFinal) : totalFinal;
    return POS_BILLETES_RD.map((monto, index) => ({ monto, tecla: index + 1 }))
      .filter(({ monto }) => monto >= minMonto);
  }, [pagoMixto, restante, totalFinal]);

  const posShortcutsEnabled =
    !!cajaActiva && !receipt && !ventaEditar && !showCamera && !mostrarCierre;

  const cashBillsEnabled =
    mode === 'payment' && (metodoPago === 'EFECTIVO' || pagoMixto);

  usePosKeyboardShortcuts({
    enabled: posShortcutsEnabled,
    mode,
    hasItems: items.length > 0,
    pagoMixto,
    cashBillsEnabled,
    actions: {
      focusSearch: () => {
        inputRef.current?.focus();
        inputRef.current?.select();
      },
      toggleGrid: () => setShowGrid((v) => !v),
      focusCliente: () => {
        if (clienteNombre) return;
        clienteInputRef.current?.focus();
        setShowClienteDrop(true);
      },
      openCamera: () => setShowCamera(true),
      pauseSale: handlePausarVenta,
      togglePaused: () => {
        if (pausedCarts.length === 0) return;
        setShowPaused((v) => !v);
      },
      goToPayment: () => {
        if (items.length === 0) return;
        setMode('payment');
      },
      goToCart: () => {
        if (registrar.isPending) return;
        setMode('cart');
      },
      setExactCash: () => {
        applyMetodoPago('EFECTIVO');
        setEfectivoRecibido(totalFinal);
        setPagos([{ metodo: 'EFECTIVO', monto: totalFinal }]);
      },
      confirmSale: handleConfirmar,
      clearCart: handleLimpiarCarrito,
      selectPaymentMethod: selectPaymentMethodByIndex,
      toggleShortcutsHelp: () => setShowShortcutsHelp((v) => !v),
      navigateLine: navigateCartLine,
      adjustLineQty: adjustFocusedLineQty,
      removeFocusedLine: removeFocusedCartLine,
      applyQuickBill,
    },
  });

  // ── Guard: caja ───────────────────────────────────────────────────────────
  if (user && !isAdmin && user.tiendaId == null) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-8 bg-navy-50">
        <div className="bg-white rounded-[12px] shadow-card max-w-md p-8 text-center">
          <Lock className="mx-auto text-amber-500 mb-3" size={32} />
          <p className="font-semibold text-navy-800 mb-2">Sin sucursal asignada</p>
          <p className="text-sm text-navy-500">
            Tu usuario debe tener una sucursal para usar Nexo. Pide al administrador que asigne tu tienda en Empleados.
          </p>
        </div>
      </div>
    );
  }

  if (cajasQueryEnabled && cajasLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cajasQueryEnabled && !cajasLoading && cajasElegibles.length === 0) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-8 bg-navy-50">
        <div className="bg-white rounded-[12px] shadow-card max-w-md p-8 text-center">
          <Lock className="mx-auto text-navy-300 mb-3" size={32} />
          <p className="font-semibold text-navy-800 mb-2">No hay cajas disponibles</p>
          <p className="text-sm text-navy-500">
            {isAdmin
              ? 'Registra cajas en el menú «Cajas» y asígnalas a una sucursal.'
              : 'No hay cajas registradas para tu sucursal. Contacta al administrador.'}
          </p>
        </div>
      </div>
    );
  }

  if (cajaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cajaActivaError) {
    const msg = cajaActivaErrorObj instanceof Error
      ? cajaActivaErrorObj.message
      : 'No se pudo validar el estado de la caja.';
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 sm:p-8 bg-navy-50">
        <div className="bg-white rounded-[12px] shadow-card max-w-lg w-full p-6 sm:p-8">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="text-amber-700" size={22} />
          </div>
          <p className="font-semibold text-navy-800 mb-2">Caja no disponible</p>
          <p className="text-sm text-navy-500 leading-relaxed mb-4">
            {msg}
          </p>
          {cajasElegibles.length > 1 && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-navy-500 uppercase tracking-wider block mb-2">
                Cambiar caja
              </label>
              <Select
                value={selectedCajaId === '' ? '' : String(selectedCajaId)}
                onChange={(e) => handleSelectCajaPos(Number(e.target.value))}
              >
                {cajasElegibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatTiendaCajaLine(c.tienda?.nombre, c.nombre)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <button
            type="button"
            onClick={() => void refetchCajaActiva()}
            disabled={cajaActivaFetching}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            {cajaActivaFetching && <Loader2 size={14} className="animate-spin" />}
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  /* Cierre: usar snapshot — tras cerrar en API, `cajaActiva` es null pero el usuario sigue en pantalla de resultado */
  if (mostrarCierre && cierreCtx) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-navy-50 flex items-start justify-center p-4 sm:p-8">
        <CierreCaja
          aperturaId={cierreCtx.aperturaId}
          montoApertura={cierreCtx.montoApertura}
          fechaApertura={cierreCtx.fechaApertura}
          cajaNombre={effectiveNombre}
          onCerrada={() => {
            setMostrarCierre(false);
            setCierreCtx(null);
          }}
          onVolver={() => {
            setMostrarCierre(false);
            setCierreCtx(null);
          }}
        />
      </div>
    );
  }

  /* Sin caja abierta en servidor → apertura (useAbrirCaja invalida la query y aparece el POS) */
  if (!cajaActiva) {
    return (
      <>
        {showCajaSelector && (
          <div className="bg-navy-100/80 border-b border-navy-200 px-4 py-3 flex flex-wrap items-center gap-3 justify-center shrink-0">
            <span className="text-sm font-medium text-navy-700">
              {isAdmin ? 'Caja para esta sesión' : 'Elige la caja a abrir'}
            </span>
            <Select
              variant="toolbar"
              wrapperClassName="w-full max-w-md min-w-[220px]"
              value={selectedCajaId === '' ? '' : String(selectedCajaId)}
              onChange={(e) => handleSelectCajaPos(Number(e.target.value))}
            >
              {cajasElegibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatTiendaCajaLine(c.tienda?.nombre, c.nombre)}
                </option>
              ))}
            </Select>
          </div>
        )}
        <AperturaCaja
          cajaNombre={effectiveNombre}
          cajaId={effectiveCajaId}
          tiendaId={effectiveTiendaId}
          onAbierta={() => {
            /* la query `caja/activa` se actualiza sola */
          }}
        />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mientras el comprobante post-venta está abierto, el POS queda oculto hasta «Nueva venta» */}
      <div
        className={`-m-4 lg:-m-6 ${receipt ? 'min-h-[calc(100vh-3.5rem)]' : ''}`}
      >
      <div
        className={`flex h-[calc(100vh-3.5rem)] overflow-hidden ${receipt ? 'hidden' : ''}`}
      >

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
                placeholder="Código de barras o nombre del artículo… (F2)"
                title="Buscar artículo (F2)"
                className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                  notFound   ? 'border-red-400 bg-red-50' :
                  scanFlash  ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300' :
                  'border-navy-200'
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
              type="button"
              onClick={() => setShowShortcutsHelp((v) => !v)}
              title="Atajos de teclado (?)"
              className={`flex items-center justify-center p-2 rounded-lg border text-sm transition-colors ${
                showShortcutsHelp
                  ? 'bg-primary-50 border-primary-400 text-primary-600'
                  : 'border-navy-200 text-navy-400 hover:border-navy-300 hover:text-navy-600'
              }`}
              aria-label="Atajos de teclado"
              aria-pressed={showShortcutsHelp}
            >
              <Keyboard size={15} />
            </button>
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              title="Escanear con cámara (F5)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-navy-200 text-navy-500 hover:border-primary-400 hover:text-primary-600 text-sm font-medium transition-colors"
            >
              <Camera size={15} />
              <span className="hidden sm:inline">Cámara</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGrid((v) => !v)}
              title="Cuadrícula de productos (F3)"
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
                  <p className="text-navy-300 text-xs mt-2">↑↓ línea · +/- cantidad · <kbd className="font-mono text-[10px]">?</kbd> atajos</p>
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
                  {items.map((item, idx) => (
                    <tr
                      key={item.articulo.id}
                      ref={(el) => {
                        if (el) cartRowRefs.current.set(idx, el);
                        else cartRowRefs.current.delete(idx);
                      }}
                      onClick={() => setCartLineFocus(idx)}
                      className={`group border-b border-navy-100/40 cursor-pointer transition-colors ${
                        cartLineFocus === idx
                          ? 'bg-primary-50 ring-1 ring-inset ring-primary-300'
                          : 'hover:bg-white/80'
                      }`}
                    >
                      <td className="table-cell pl-4">
                        <p className="font-medium text-navy-800 text-sm">{nombreArticuloConUnidad(item.articulo)}</p>
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
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col min-w-0 gap-0.5">
                  <span className="text-xs font-semibold text-navy-400 uppercase tracking-wide">
                    {cajaActiva?.cajaNombre ?? effectiveNombre}
                  </span>
                  {cajaActiva?.tienda?.nombre && (
                    <span className="text-[10px] text-navy-400 truncate" title={cajaActiva.tienda.nombre}>
                      {cajaActiva.tienda.nombre}
                    </span>
                  )}
                </div>
                {pausedCarts.length > 0 && (
                  <button
                    onClick={() => setShowPaused((v) => !v)}
                    className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-700 transition-colors font-medium shrink-0"
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
                type="button"
                onClick={() => {
                  if (!cajaActiva) return;
                  setCierreCtx({
                    aperturaId:    cajaActiva.id,
                    montoApertura: cajaActiva.montoApertura,
                    fechaApertura: cajaActiva.fechaApertura,
                  });
                  setMostrarCierre(true);
                }}
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
                          ref={clienteInputRef}
                          value={clienteSearch}
                          onChange={(e) => { setClienteSearch(e.target.value); setShowClienteDrop(true); }}
                          onFocus={() => setShowClienteDrop(true)}
                          placeholder="Buscar cliente (F4)"
                          title="Buscar cliente (F4)"
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

                  {cargoDelivery > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span className="flex items-center gap-1"><Bike size={12} /> Delivery</span>
                      <span>+{formatCurrency(cargoDelivery)}</span>
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
                        <span className="text-navy-400 truncate max-w-[60%]">{item.cantidad}× {nombreArticuloConUnidad(item.articulo)}</span>
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
                  type="button"
                  onClick={() => setMode('payment')}
                  disabled={items.length === 0}
                  title="Ir a cobrar (F8)"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:bg-navy-200 disabled:text-navy-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  <ShoppingCart size={16} />
                  {items.length > 0 ? `Cobrar ${formatCurrency(totalFinal)}` : 'Sin artículos'}
                  {items.length > 0 && (
                    <kbd className="hidden lg:inline font-mono text-[10px] opacity-70 ml-1">F8</kbd>
                  )}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePausarVenta}
                    disabled={items.length === 0}
                    title="Pausar esta venta (F6)"
                    className="flex-1 flex items-center justify-center gap-1.5 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-30 text-amber-600 py-2 rounded-xl transition-colors text-xs font-medium"
                  >
                    <PauseCircle size={13} /> Pausar
                  </button>
                  <button
                    type="button"
                    onClick={handleLimpiarCarrito}
                    disabled={items.length === 0}
                    title="Vaciar carrito (Shift+Del)"
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
                    <p className="text-xs opacity-60 mt-1">Desc.: -{formatCurrency(descuentoGlobal)}</p>
                  )}
                  {cargoDelivery > 0 && (
                    <p className="text-xs opacity-75 mt-0.5 flex items-center gap-1">
                      <Bike size={11} /> Delivery: +{formatCurrency(cargoDelivery)}
                    </p>
                  )}
                </div>

                {/* ── PAGO SIMPLE ── */}
                {!pagoMixto && (
                  <div>
                    <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">Forma de pago</p>
                    <div className="grid grid-cols-3 gap-2">
                      {METODOS.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => applyMetodoPago(m.id)}
                          title={`${m.label} (F${idx + 1})`}
                          className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                            metodoPago === m.id
                              ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white border-primary-500 shadow-sm'
                              : 'bg-navy-50 text-navy-500 border-transparent hover:bg-navy-100'
                          }`}
                        >
                          {m.icon}
                          <span className="text-xs">{m.label}</span>
                          <kbd className={`font-mono text-[9px] ${metodoPago === m.id ? 'opacity-80' : 'text-navy-300'}`}>
                            F{idx + 1}
                          </kbd>
                        </button>
                      ))}
                    </div>

                    {/* Efectivo: cash input */}
                    {metodoPago === 'EFECTIVO' && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-navy-600">
                          Efectivo recibido
                          {billetesRapidos.length > 0 && (
                            <span className="text-navy-400 font-normal"> · teclas 1–6 billete</span>
                          )}
                        </p>
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
                            type="button"
                            onClick={() => { setEfectivoRecibido(totalFinal); setPagos([{ metodo: 'EFECTIVO', monto: totalFinal }]); }}
                            title="Efectivo exacto (F9)"
                            className="text-xs px-2.5 py-1.5 rounded-lg border-2 border-emerald-400 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                          >
                            Exacto (F9)
                          </button>
                          {billetesRapidos.map(({ monto, tecla }) => (
                            <button
                              key={monto}
                              type="button"
                              onClick={() => { setEfectivoRecibido(monto); setPagos([{ metodo: 'EFECTIVO', monto }]); }}
                              title={`${formatCurrency(monto)} (tecla ${tecla})`}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1 ${
                                efectivoRecibido === monto ? 'bg-primary-500 text-white border-primary-500' : 'bg-navy-50 text-navy-500 border-transparent hover:bg-primary-50'
                              }`}
                            >
                              <kbd className={`font-mono text-[9px] px-1 rounded ${efectivoRecibido === monto ? 'bg-white/20' : 'bg-navy-200/80 text-navy-600'}`}>
                                {tecla}
                              </kbd>
                              {formatCurrency(monto)}
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
                      {billetesRapidos.slice(0, 4).map(({ monto, tecla }) => (
                        <button
                          key={monto}
                          type="button"
                          onClick={() => handleSetMonto('EFECTIVO', String(monto))}
                          title={`${formatCurrency(monto)} (tecla ${tecla})`}
                          className="text-xs px-2.5 py-1.5 rounded-lg border bg-navy-50 text-navy-500 border-transparent hover:bg-primary-50 transition-colors inline-flex items-center gap-1"
                        >
                          <kbd className="font-mono text-[9px] px-1 rounded bg-navy-200/80 text-navy-600">{tecla}</kbd>
                          {formatCurrency(monto)}
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
                <div className="rounded-xl border border-navy-200/70 bg-white shadow-sm overflow-hidden ring-1 ring-black/[0.03]">
                  <button
                    type="button"
                    onClick={() => setShowNCF((v) => !v)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${showNCF ? 'bg-primary-50/50' : 'hover:bg-navy-50/80'}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100/90 text-primary-700">
                      <FileText size={18} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-navy-800 text-sm">Comprobante fiscal (NCF)</span>
                      <span className="block text-[11px] text-navy-400 mt-0.5">DGII — tipo de comprobante</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {usarNCF && (
                        <span className="text-[11px] font-semibold bg-primary-600 text-white px-2 py-0.5 rounded-md tabular-nums">
                          {tipoNCF}
                        </span>
                      )}
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-100/60 text-navy-500">
                        <ChevronDown size={16} className={`transition-transform duration-200 ${showNCF ? 'rotate-180' : ''}`} aria-hidden />
                      </span>
                    </span>
                  </button>
                  {showNCF && (
                    <div className="border-t border-navy-100/80 bg-navy-50/40 px-3.5 pb-3.5 pt-1">
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-sm font-medium text-navy-700">Emitir comprobante</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={usarNCF}
                          onClick={() => setUsarNCF((v) => !v)}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors shadow-inner ${
                            usarNCF ? 'bg-primary-600' : 'bg-navy-200'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                              usarNCF ? 'translate-x-[1.375rem]' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      {usarNCF && (
                        <div className="space-y-1 rounded-lg border border-navy-100/80 bg-white p-2">
                          {tiposNcfDisponibles.length === 0 ? (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-2">
                              No hay series NCF registradas. Configúralas en Panel → Comprobantes.
                            </p>
                          ) : (
                            tiposNcfDisponibles.map((t) => (
                            <label
                              key={t.id}
                              onClick={() => setTipoNCF(t.id)}
                              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-primary-50/60 group"
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  tipoNCF === t.id
                                    ? 'border-primary-600 bg-primary-600'
                                    : 'border-navy-200 group-hover:border-primary-400'
                                }`}
                              >
                                {tipoNCF === t.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                              </div>
                              <span className={`text-xs leading-snug ${tipoNCF === t.id ? 'font-medium text-navy-800' : 'text-navy-500'}`}>
                                {t.label}
                              </span>
                            </label>
                          ))
                          )}
                          {usarNCF && proximoNcf && (
                            <p className="text-[11px] text-navy-500 border-t border-navy-100 pt-2 mt-1 px-1">
                              Próximo NCF ({TIPOS_NCF.find((t) => t.id === tipoNCF)?.label ?? `B${tipoNCF}`}):{' '}
                              <span className="font-mono font-semibold text-navy-800">{proximoNcf}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Código de promoción */}
                <div className="rounded-xl border border-navy-200/70 bg-white p-3.5 shadow-sm ring-1 ring-black/[0.03]">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <Tag size={16} strokeWidth={2} aria-hidden />
                    </span>
                    <div>
                      <span className="block text-sm font-semibold text-navy-800">Código de descuento</span>
                      <span className="block text-[11px] text-navy-400">Promoción activa en el total</span>
                    </div>
                  </div>
                  {promoDescuento > 0 ? (
                    <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200/90 bg-gradient-to-r from-emerald-50 to-white px-3 py-2.5">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-emerald-800">
                          {promoCodigo} <span className="font-normal text-emerald-600">—</span> {promoNombre}
                        </p>
                        <p className="text-xs font-medium text-emerald-700">−{formatCurrency(promoDescuento)} en esta venta</p>
                      </div>
                      <button
                        type="button"
                        title="Quitar promoción"
                        onClick={() => {
                          setPromoDescuento(0);
                          setPromoCodigo('');
                          setPromoNombre('');
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={promoCodigo}
                        onChange={(e) => setPromoCodigo(e.target.value.toUpperCase())}
                        placeholder="Ej. VERANO20"
                        className="input-field min-h-[2.625rem] flex-1 rounded-lg border-navy-200/90 text-sm font-medium tracking-wide"
                      />
                      <button
                        type="button"
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
                          } finally {
                            setPromoLoading(false);
                          }
                        }}
                        className="btn-primary shrink-0 rounded-lg px-4 text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-45 min-h-[2.625rem] min-w-[5.75rem]"
                      >
                        {promoLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Aplicar'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Delivery */}
                <div className="rounded-xl border border-navy-200/70 bg-white shadow-sm overflow-hidden ring-1 ring-black/[0.03]">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={esDelivery}
                    onClick={() => setEsDelivery((v) => !v)}
                    className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                      esDelivery ? 'bg-sky-50/50' : 'hover:bg-navy-50/80'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        esDelivery ? 'bg-sky-100 text-sky-700' : 'bg-navy-100/80 text-navy-500'
                      }`}
                    >
                      <Bike size={18} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-navy-800 text-sm">Delivery</span>
                      <span className="block text-[11px] text-navy-400 mt-0.5">
                        {esDelivery ? 'Cargo y dirección abajo' : 'Activa si aplica envío a domicilio'}
                      </span>
                    </span>
                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors shadow-inner ${
                        esDelivery ? 'bg-primary-600' : 'bg-navy-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                          esDelivery ? 'translate-x-[1.375rem]' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                  {esDelivery && (
                    <div className="space-y-2.5 border-t border-navy-100/80 bg-navy-50/40 px-3.5 pb-3.5 pt-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">Cargo de delivery (RD$)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={deliveryCargo}
                          onChange={(e) => {
                            const v = e.target.value === '' ? '' : Number(e.target.value);
                            setDeliveryCargo(v);
                          }}
                          className="input-field rounded-lg"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-navy-600">Dirección / zona</label>
                        <input
                          type="text"
                          value={deliveryDireccion}
                          onChange={(e) => setDeliveryDireccion(e.target.value)}
                          maxLength={300}
                          className="input-field rounded-lg"
                          placeholder="Calle, sector, referencias…"
                        />
                      </div>
                      {cargoDelivery > 0 && (
                        <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-medium text-amber-900">
                          Se suman <span className="tabular-nums">{formatCurrency(cargoDelivery)}</span> al total del cliente.
                        </p>
                      )}
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
                {esDelivery && !deliveryMontoValido && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                    Ingresa el cargo de delivery para continuar
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={!puedeConfirmar || registrar.isPending || (usarNCF && !clienteId) || (usarNCF && !comprobanteSeleccionado)}
                  title="Confirmar venta (F10 o Ctrl+Enter)"
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-navy-200 disabled:text-navy-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {registrar.isPending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle size={16} />}
                  {registrar.isPending ? 'Procesando…' : `Confirmar ${formatCurrency(totalFinal)}`}
                  {!registrar.isPending && (
                    <kbd className="hidden sm:inline font-mono text-[10px] opacity-75">F10</kbd>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('cart')}
                  disabled={registrar.isPending}
                  title="Volver al carrito (Esc)"
                  className="w-full text-xs text-navy-400 hover:text-navy-500 py-1.5 transition-colors"
                >
                  Cancelar (Esc)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      {/* Mobile bottom bar — only in cart mode on small screens */}
      {mode === 'cart' && !receipt && (
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

      {/* Comprobante tras cobrar: Imprimir / Editar (admin) / Continuar — sin auto-print */}
      {receipt && (
        <Receipt
          variant="pos"
          venta={receipt}
          onClose={() => setReceipt(null)}
          onContinue={() => setReceipt(null)}
          onEdit={
            isAdmin
              ? async () => {
                  try {
                    const v = await ventasService.getById(receipt.id);
                    setReceipt(null);
                    setVentaEditar(v);
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : 'No se pudo cargar la venta');
                  }
                }
              : undefined
          }
          autoPrint
        />
      )}

      {ventaEditar && (
        <VentaModal
          venta={ventaEditar}
          isAdmin={isAdmin}
          onClose={() => setVentaEditar(null)}
          onRefresh={() => setVentaEditar(null)}
        />
      )}

      {showCamera && (
        <BarcodeCamera
          onDetect={handleCodigoDetectado}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showShortcutsHelp && posShortcutsEnabled && (
        <PosShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />
      )}
    </>
  );
}

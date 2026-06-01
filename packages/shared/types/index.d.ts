export type Rol = 'admin' | 'cajero' | 'soporte' | 'contador' | 'plataforma';
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data: T;
}
export interface PaginatedResponse<T = unknown> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface LoginPayload {
    email: string;
    password: string;
}
export interface AuthUser {
    id: number;
    nombre: string;
    email: string;
    rol: Rol;
    /** Organización (multi-tenant). Si falta (token antiguo), tratar como `1`. */
    tenantId?: number;
    tiendaId?: number;
}
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}
/** Feature flags por plan — `false` bloquea la creación en ese módulo. */
export interface PlanFeatures {
    kits: boolean;
    cotizaciones: boolean;
    promociones: boolean;
    tarjetasRegalo: boolean;
    recetas: boolean;
    compras: boolean;
}
/** Límites declarativos del plan (producto SaaS). */
export interface SaasPlanLimits {
    code: string;
    label: string;
    maxUsers: number | null;
    maxTiendas: number | null;
    /** Artículos activos en catálogo. `null` = ilimitado. */
    maxArticulos: number | null;
    features: PlanFeatures;
}
/** Uso actual frente al plan (misma regla que `enforce-plan.ts`). */
export interface SaasUsage {
    /** Usuarios-asiento activos (sin rol plataforma). */
    seats: number;
    tiendasActivas: number;
    /** Artículos activos en catálogo. */
    articulosActivos: number;
    /** Ventas no anuladas en el mes calendario actual (métrica informacional). */
    ventasMesActual: number;
}
/** Respuesta de `GET /saas/context`. */
export interface SaasContext {
    tenant: {
        id: number;
        nombre: string;
        slug: string;
        planCode: string;
        activo: boolean;
    };
    limits: SaasPlanLimits;
    usage: SaasUsage;
    /**
     * `true` cuando Stripe está configurado pero el tenant no tiene aún
     * `stripeCustomerId` (nunca ha pasado por Checkout). Señal para mostrar
     * el banner de provisioning guiado en el dashboard.
     */
    needsOnboarding: boolean;
    /** Periodo de prueba (`tenants.trialEndsAt` en BD). */
    trial: {
        endsAt: string | null;
        active: boolean;
        expired: boolean;
        daysRemaining: number | null;
    };
}
export type TipoIdentificacion = 'CEDULA' | 'RNC' | 'PASAPORTE';
export interface ICliente {
    id: number;
    nombre: string;
    compania?: string;
    correo?: string;
    telefono?: string;
    tipoIdentificacion?: TipoIdentificacion;
    numeroIdentificacion?: string;
    saldo: number;
    limiteCredito: number;
    descuentoCliente: number;
    activo: boolean;
    createdAt: string;
}
export interface IArticulo {
    id: number;
    codigoBarras: string;
    nombre: string;
    costo: number;
    precioVenta: number;
    cantidad: number | null;
    tamanio?: string;
    /** Unidad de venta/stock (ej. und, kg, ml) */
    unidadMedida?: string | null;
    categoria: ICategoria;
    activo: boolean;
}
export interface ICategoria {
    id: number;
    nombre: string;
}
export type TipoMovimientoInventario = 'VENTA' | 'DEVOLUCION' | 'AJUSTE' | 'COMPRA' | 'ENTRADA_MANUAL' | 'SALIDA_MANUAL';
export interface IMovimientoInventario {
    id: number;
    tipo: TipoMovimientoInventario;
    cantidad: number;
    stockAntes: number;
    stockDespues: number;
    referenciaId?: number;
    referenciaTipo?: string;
    notas?: string;
    usuario?: {
        id: number;
        nombre: string;
    };
    createdAt: string;
}
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';
export interface IVenta {
    id: number;
    subtotal: number;
    descuento: number;
    impuesto: number;
    total: number;
    metodoPago: MetodoPago;
    metodosPago?: {
        metodo: MetodoPago;
        monto: number;
    }[];
    comprobante?: string;
    notas?: string;
    /** Efectivo entregado por el cliente */
    efectivoRecibido?: number | null;
    /** Cambio entregado al cliente */
    cambio?: number | null;
    /** ¿Es una venta con entrega a domicilio? */
    esDelivery?: boolean;
    /** Cargo de delivery cobrado al cliente */
    deliveryCargo?: number;
    /** Dirección o zona de entrega */
    deliveryDireccion?: string | null;
    fecha: string;
    cliente?: ICliente;
    /** Quien registró la venta (auditoría) */
    usuario?: {
        id: number;
        nombre: string;
    };
    /** Sesión de caja donde se cobró (auditoría) */
    cajaApertura?: {
        id: number;
        cajaNombre: string;
        caja?: {
            id: number;
            nombre: string;
        } | null;
        tienda?: {
            id: number;
            nombre: string;
        } | null;
    };
    detalles: IVentaDetalle[];
}
export interface IVentaDetalle {
    id: number;
    articulo: IArticulo;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    total: number;
}
export interface IGasto {
    id: number;
    escribe: string;
    descripcion?: string;
    categoria: string;
    fecha: string;
    cantidad: number;
    impuesto: number;
    nombreRecipiente?: string;
    aprobadoPor?: {
        id: number;
        nombre: string;
    };
    createdAt: string;
}
export interface IEmpleado {
    id: number;
    nombre: string;
    correo: string;
    telefono?: string;
    rol: Rol;
    activo: boolean;
    foto?: string;
    createdAt: string;
    /** Sucursal asignada (obligatoria para roles distintos de admin) */
    tiendaId?: number | null;
    tiendaNombre?: string | null;
}
export interface IProveedor {
    id: number;
    nombre: string;
    contacto?: string;
    telefono?: string;
    correo?: string;
    direccion?: string;
    rnc?: string;
    activo: boolean;
    createdAt: string;
}
export type TipoComprobante = '01' | '02' | '04' | '14' | '15';
export interface IComprobante {
    id: number;
    descripcion: string;
    series: string;
    tipo: TipoComprobante;
    desde: string;
    hasta: string;
    secuenciaActual: string;
    activo: boolean;
    updatedAt: string;
}
export interface IConfiguracion {
    id: number;
    nombreCompania: string;
    rnc?: string;
    direccion?: string;
    telefono?: string;
    sitioWeb?: string;
    simboloMoneda: string;
    numeroDecimales: number;
    preciosIncluyenImpuesto: boolean;
    tasaImpuesto1Nombre?: string;
    tasaImpuesto1: number;
    tasaImpuesto2Nombre?: string;
    tasaImpuesto2: number;
    logotipoUrl?: string;
    /** Texto adicional al pie del recibo impreso (opcional) */
    textoPieRecibo?: string | null;
    comprobanteDefecto: string;
    /** Prioridad sobre `FISCAL_JURISDICTION` del servidor; vacío en UI = usar solo `.env` */
    fiscalJurisdiccion?: string | null;
    /** Zona IANA para agregaciones diarias en reportes */
    zonaHoraria?: string;
    nombreCaja: string;
    /** Sucursal por defecto para apertura de caja y gastos */
    tiendaId?: number | null;
    /** Caja del catálogo asignada a este POS */
    cajaId?: number | null;
    caja?: {
        id: number;
        nombre: string;
        tienda?: {
            id: number;
            nombre: string;
        };
    };
    updatedAt: string;
}
export interface ICaja {
    id: number;
    nombre: string;
    activo: boolean;
    notas?: string | null;
    tienda?: {
        id: number;
        nombre: string;
    };
    createdAt: string;
    updatedAt: string;
}
export interface IAperturaCaja {
    denominaciones: Record<string, number>;
    montoApertura: number;
    cajaId: number;
}
export type TipoMovimiento = 'CARGO' | 'ABONO';
export interface IMovimientoCredito {
    tipo: TipoMovimiento;
    fecha: string;
    monto: number;
    notas: string;
    referencia: number;
    creadoPor?: string;
}
export interface IEstadoCuenta {
    cliente: {
        id: number;
        nombre: string;
        correo?: string;
        telefono?: string;
        saldo: number;
    };
    movimientos: IMovimientoCredito[];
    totalCargos: number;
    totalAbonos: number;
}
export type EstadoDevolucion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
export interface IDevolucionDetalle {
    id: number;
    cantidad: number;
    precioUnitario: number;
    total: number;
    regresaAInventario: boolean;
    articulo: IArticulo;
}
export interface IDevolucion {
    id: number;
    estado: EstadoDevolucion;
    motivo: string;
    notas?: string;
    total: number;
    metodoReembolso: MetodoPago;
    venta: IVenta;
    creadoPor?: {
        id: number;
        nombre: string;
    };
    revisadoPor?: {
        id: number;
        nombre: string;
    };
    detalles: IDevolucionDetalle[];
    createdAt: string;
}
export type EstadoOrden = 'BORRADOR' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA';
export interface IOrdenCompraDetalle {
    id: number;
    cantidad: number;
    cantidadRecibida: number;
    costoUnitario: number;
    total: number;
    articulo: IArticulo;
}
export interface IOrdenCompra {
    id: number;
    estado: EstadoOrden;
    total: number;
    notas?: string;
    fechaEsperada?: string;
    fechaRecibida?: string;
    proveedor?: IProveedor;
    creadoPor?: {
        id: number;
        nombre: string;
    };
    detalles: IOrdenCompraDetalle[];
    createdAt: string;
    updatedAt: string;
}
export interface IKitDetalle {
    id: number;
    cantidad: number;
    articulo: IArticulo;
}
export interface IKit {
    id: number;
    nombre: string;
    precio: number;
    descripcion?: string;
    activo: boolean;
    createdAt: string;
    detalles: IKitDetalle[];
}
export interface ITienda {
    id: number;
    nombre: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    activo: boolean;
}
export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'VENCIDA';
export interface ICotizacionDetalle {
    id: number;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    total: number;
    articulo: IArticulo;
}
export interface ICotizacion {
    id: number;
    estado: EstadoCotizacion;
    notas?: string;
    validezDias: number;
    subtotal: number;
    descuento: number;
    total: number;
    cliente?: ICliente;
    creadoPor?: {
        id: number;
        nombre: string;
    };
    detalles: ICotizacionDetalle[];
    createdAt: string;
    updatedAt: string;
}
export interface IRecetaIngrediente {
    id: number;
    cantidad: number;
    articulo: IArticulo;
}
export interface IReceta {
    id: number;
    nombre: string;
    descripcion?: string;
    cantidadResultado: number;
    activa: boolean;
    articuloResultado: IArticulo;
    ingredientes: IRecetaIngrediente[];
    createdAt: string;
    updatedAt: string;
}
export type AuditOperacion = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'READ';
export interface IAuditLog {
    id: number;
    tabla: string;
    operacion: AuditOperacion;
    registroId?: number;
    descripcion: string;
    valorAnterior?: string;
    valorNuevo?: string;
    usuarioId?: number;
    usuarioNombre?: string;
    ip?: string;
    createdAt: string;
}
export interface TenantPanelUsage {
    seats: number;
    tiendasActivas: number;
    articulosActivos: number;
    ventasMesActual: number;
}
export interface TenantPanelLimits {
    maxUsers: number | null;
    maxTiendas: number | null;
    maxArticulos: number | null;
}
export interface TenantPanelRow {
    id: number;
    nombre: string;
    slug: string;
    activo: boolean;
    planCode: string;
    planLabel: string;
    billingStatus: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    /** ISO 8601 o null — fin de trial en BD. */
    trialEndsAt?: string | null;
    usage: TenantPanelUsage;
    limits: TenantPanelLimits;
    createdAt: string;
}
export * from '../validation/configuracion';
//# sourceMappingURL=index.d.ts.map
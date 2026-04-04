// ============================
// Roles del sistema
// ============================
export type Rol = 'admin' | 'cajero' | 'soporte';

// ============================
// Respuesta genérica de la API
// ============================
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

// ============================
// Auth
// ============================
export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  tiendaId?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ============================
// Cliente
// ============================
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

// ============================
// Artículo / Inventario
// ============================
export interface IArticulo {
  id: number;
  codigoBarras: string;
  nombre: string;
  costo: number;
  precioVenta: number;
  cantidad: number | null;
  tamanio?: string;
  categoria: ICategoria;
  activo: boolean;
}

export interface ICategoria {
  id: number;
  nombre: string;
}

export type TipoMovimientoInventario =
  | 'VENTA'
  | 'DEVOLUCION'
  | 'AJUSTE'
  | 'COMPRA'
  | 'ENTRADA_MANUAL'
  | 'SALIDA_MANUAL';

export interface IMovimientoInventario {
  id: number;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  referenciaId?: number;
  referenciaTipo?: string;
  notas?: string;
  usuario?: { id: number; nombre: string };
  createdAt: string;
}

// ============================
// Venta
// ============================
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';

export interface IVenta {
  id: number;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  metodoPago: MetodoPago;
  metodosPago?: { metodo: MetodoPago; monto: number }[];
  comprobante?: string;
  notas?: string;
  fecha: string;
  cliente?: ICliente;
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

// ============================
// Gasto
// ============================
export interface IGasto {
  id: number;
  escribe: string;
  descripcion?: string;
  categoria: string;
  fecha: string;
  cantidad: number;
  impuesto: number;
  nombreRecipiente?: string;
  aprobadoPor?: { id: number; nombre: string };
  createdAt: string;
}

// ============================
// Empleado
// ============================
export interface IEmpleado {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: Rol;
  activo: boolean;
  foto?: string;
  createdAt: string;
}

// ============================
// Proveedor
// ============================
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

// ============================
// Comprobante NCF
// ============================
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

// ============================
// Configuracion
// ============================
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
  comprobanteDefecto: string;
  nombreCaja: string;
  updatedAt: string;
}

// ============================
// Caja
// ============================
export interface IAperturaCaja {
  denominaciones: Record<string, number>;
  montoApertura: number;
  cajaId: number;
}

// ============================
// Crédito
// ============================
export type TipoMovimiento = 'CARGO' | 'ABONO';

export interface IMovimientoCredito {
  tipo:        TipoMovimiento;
  fecha:       string;
  monto:       number;
  notas:       string;
  referencia:  number;
  creadoPor?:  string;
}

export interface IEstadoCuenta {
  cliente: {
    id:       number;
    nombre:   string;
    correo?:  string;
    telefono?: string;
    saldo:    number;
  };
  movimientos:  IMovimientoCredito[];
  totalCargos:  number;
  totalAbonos:  number;
}

// ============================
// Devolución
// ============================
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
  creadoPor?: { id: number; nombre: string };
  revisadoPor?: { id: number; nombre: string };
  detalles: IDevolucionDetalle[];
  createdAt: string;
}

// ============================
// Orden de Compra
// ============================
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
  creadoPor?: { id: number; nombre: string };
  detalles: IOrdenCompraDetalle[];
  createdAt: string;
  updatedAt: string;
}

// ============================
// Kit
// ============================
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

// ============================
// Tienda
// ============================
export interface ITienda {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

// ============================
// Cotizaciones
// ============================
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
  creadoPor?: { id: number; nombre: string };
  detalles: ICotizacionDetalle[];
  createdAt: string;
  updatedAt: string;
}

// ============================
// Auditoría
// ============================
export type AuditOperacion = 'CREATE' | 'UPDATE' | 'DELETE';

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

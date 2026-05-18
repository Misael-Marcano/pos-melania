import apiClient from './api.client';

export interface VentaDia {
  dia:             string;
  totalVentas:     number;
  totalMonto:      number;
}

export interface TopProducto {
  nombre:           string;
  unidadesVendidas: number;
  totalVentas:      number;
}

export interface ResumenDia {
  totalTransacciones: number;
  totalVentas:        number;
  totalEfectivo:      number;
  totalGastos:        number;
}

export interface PnL {
  desde: string; hasta: string;
  ingresos: number; costoVentas: number; devoluciones: number;
  utilidadBruta: number; gastos: number; utilidadNeta: number;
  margenBruto: number; margenNeto: number;
  ventasPorMetodo:    { metodoPago: string; cantidad: number; total: number }[];
  gastosPorCategoria: { categoria: string; cantidad: number; total: number }[];
}

export interface InventarioArticulo {
  nombre: string; codigoBarras: string; cantidad: number;
  costo: number; precioVenta: number;
  valorCosto: number; valorVenta: number; categoria: string;
}

export interface InventarioValorizado {
  articulos: {
    items: InventarioArticulo[];
    total: number;
    page: number;
    limit: number;
  };
  totales: {
    totalCosto: number; totalVenta: number;
    totalArticulos: number; totalUnidades: number; gananciaLatente: number;
  };
  porCategoria: { categoria: string; articulos: number; valorCosto: number }[];
}

export interface Dgii607Preview {
  periodo: string;
  lineas: number;
  totalVentas: number;
  itbisEstimado: number;
  sinNcf: number;
  clienteSinIdentificacion: number;
  rncEmpresa: string | null;
  alertas: string[];
}

export interface Dgii606Preview {
  periodo: string;
  lineas: number;
  lineasOrdenes: number;
  lineasGastos: number;
  totalCompras: number;
  itbisEstimado: number;
  ordenSinRncProveedor: number;
  rncEmpresa: string | null;
  alertas: string[];
}

export interface TopCliente {
  id: number; nombre: string; compania?: string;
  saldo: number; totalTransacciones: number; totalCompras: number;
}

export interface InventarioAlertaArticulo {
  id: number;
  nombre: string;
  codigoBarras: string;
  cantidad: number;
  costo?: number;
  precioVenta?: number;
  categoria: string | null;
  ultimoMovimiento?: string | null;
}

export interface InventarioAlertas {
  umbral: number;
  diasSinMovimiento: number;
  resumen: {
    sinStock: number;
    bajoUmbral: number;
    totalBajo: number;
    sinMovimiento: number;
  };
  stockBajo: InventarioAlertaArticulo[];
  sinMovimiento: InventarioAlertaArticulo[];
}

export interface CarteraBucket {
  id: string;
  etiqueta: string;
  clientes: number;
  total: number;
}

export interface CarteraCliente {
  id: number;
  nombre: string;
  compania: string | null;
  saldo: number;
  limiteCredito: number | null;
  fechaDeudaMasAntigua: string | null;
  diasAntiguedad: number | null;
  bucketId: string;
  bucketEtiqueta: string;
}

export interface CarteraReporte {
  resumen: { totalCartera: number; clientesConSaldo: number };
  buckets: CarteraBucket[];
  clientes: CarteraCliente[];
}

export interface ResumenPorSucursal {
  tienda: { id: number; nombre: string };
  desde: string;
  hasta: string;
  ventas: { transacciones: number; total: number };
  ventasPorMetodo: { metodoPago: string; cantidad: number; total: number }[];
  gastos: { registros: number; total: number };
  gastosPorCategoria: { categoria: string; total: number; n: number }[];
  sesionesCaja: {
    id: number;
    cajaNombre: string;
    cajaId: number | null;
    montoApertura: number;
    montoCierre: number | null;
    fechaApertura: string;
    fechaCierre: string | null;
    abierta: boolean;
  }[];
}

export interface VentaPorUsuario {
  usuarioId: number;
  usuarioNombre: string;
  transacciones: number;
  totalMonto: number;
}

export interface VentaPorCaja {
  tiendaNombre: string;
  cajaNombre: string;
  transacciones: number;
  totalMonto: number;
}

export interface ConciliacionCajaItem {
  aperturaId: number;
  cajaNombre: string;
  tiendaNombre: string | null;
  fechaApertura: string;
  fechaCierre: string | null;
  nota: string;
  montoApertura: number;
  montoCierre: number | null;
  totalEfectivo: number;
  totalGastos: number;
  totalVentas: number;
  cantidadVentas: number;
  cerrada: boolean;
  efectivoEsperado: number;
  diferencia: number | null;
  diferenciaVsApertura: number | null;
  cuadra: boolean | null;
  alerta: string | null;
}

export interface OperacionesComerciales {
  desde: string;
  hasta: string;
  timezone: string;
  ventas: { transacciones: number; monto: number };
  cotizaciones: {
    porEstado: { estado: string; cantidad: number; monto: number }[];
    conversion: {
      aceptadas: number;
      rechazadas: number;
      vencidas: number;
      enviadas: number;
      borrador: number;
      tasaCierre: number | null;
    };
  };
  promociones: {
    activas: number;
    usosTotales: number;
    top: { codigo: string; nombre: string; usosActuales: number; tipo: string; valor: number }[];
  };
  compras: { ordenesRecibidas: number; monto: number };
  ratioComprasVentas: number | null;
}

export interface CompararPeriodos {
  referencia: string;
  nota: string;
  actual: {
    desde: string;
    hasta: string;
    etiqueta: string;
    ventas: { totalVentas: number; totalMonto: number; ticketPromedio: number };
    pnl: { ingresos: number; utilidadBruta: number; utilidadNeta: number; margenNeto: number; gastos: number };
  };
  anterior: CompararPeriodos['actual'];
  variacion: {
    totalMontoPct: number | null;
    transaccionesPct: number | null;
    ticketPromedioPct: number | null;
    ingresosPct: number | null;
    utilidadNetaPct: number | null;
    margenNetoPts: number;
  };
}

function rangoParams(desde: string, hasta: string, tiendaId?: number | null, extra?: Record<string, unknown>) {
  const params: Record<string, string | number> = { desde, hasta, ...extra as Record<string, string | number> };
  if (tiendaId != null) params.tiendaId = tiendaId;
  return params;
}

export const reportesService = {
  ventasPorDia: async (desde: string, hasta: string, tiendaId?: number | null): Promise<VentaDia[]> => {
    const { data } = await apiClient.get('/reportes/ventas-por-dia', { params: rangoParams(desde, hasta, tiendaId) });
    return data.data;
  },

  topProductos: async (desde: string, hasta: string, limit = 10, tiendaId?: number | null): Promise<TopProducto[]> => {
    const { data } = await apiClient.get('/reportes/top-productos', {
      params: rangoParams(desde, hasta, tiendaId, { limit }),
    });
    return data.data;
  },

  resumenDia: async (fecha: string, tiendaId?: number | null): Promise<ResumenDia> => {
    const params: Record<string, string | number> = { fecha };
    if (tiendaId != null) params.tiendaId = tiendaId;
    const { data } = await apiClient.get('/reportes/resumen-dia', { params });
    return data.data;
  },

  ganancias: async (desde: string, hasta: string, tiendaId?: number | null): Promise<PnL> => {
    const { data } = await apiClient.get('/reportes/ganancias', { params: rangoParams(desde, hasta, tiendaId) });
    return data.data;
  },

  operacionesComerciales: async (desde: string, hasta: string): Promise<OperacionesComerciales> => {
    const { data } = await apiClient.get('/reportes/operaciones-comerciales', {
      params: { desde, hasta },
    });
    return data.data;
  },

  ventasResumenPdf: async (desde: string, hasta: string, tiendaId?: number | null): Promise<void> => {
    const response = await apiClient.get('/reportes/ventas-resumen/pdf', {
      params: rangoParams(desde, hasta, tiendaId),
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventas-resumen-${desde}_${hasta}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },

  compararPeriodos: async (referencia: string, tiendaId?: number | null): Promise<CompararPeriodos> => {
    const params: Record<string, string | number> = { referencia };
    if (tiendaId != null) params.tiendaId = tiendaId;
    const { data } = await apiClient.get('/reportes/comparar-periodos', { params });
    return data.data;
  },

  inventarioValorizado: async (page = 1, limit = 25, q = ''): Promise<InventarioValorizado> => {
    const { data } = await apiClient.get('/reportes/inventario-valorizado', {
      params: { page, limit, q: q || undefined },
    });
    return data.data;
  },

  inventarioValorizadoExport: async (q = ''): Promise<InventarioArticulo[]> => {
    const { data } = await apiClient.get('/reportes/inventario-valorizado/export', {
      params: q ? { q } : undefined,
    });
    return data.data;
  },

  inventarioAlertas: async (
    umbral = 5,
    diasSinMovimiento = 90,
    limit = 100,
  ): Promise<InventarioAlertas> => {
    const { data } = await apiClient.get('/reportes/inventario-alertas', {
      params: { umbral, diasSinMovimiento, limit },
    });
    return data.data;
  },

  cartera: async (): Promise<CarteraReporte> => {
    const { data } = await apiClient.get('/reportes/cartera');
    return data.data;
  },

  dgii607Preview: async (periodo: string): Promise<Dgii607Preview> => {
    const { data } = await apiClient.get('/reportes/dgii-607/preview', { params: { periodo } });
    return data.data;
  },

  dgii606Preview: async (periodo: string): Promise<Dgii606Preview> => {
    const { data } = await apiClient.get('/reportes/dgii-606/preview', { params: { periodo } });
    return data.data;
  },

  topClientes: async (desde: string, hasta: string, limit = 10, tiendaId?: number | null): Promise<TopCliente[]> => {
    const { data } = await apiClient.get('/reportes/top-clientes', {
      params: rangoParams(desde, hasta, tiendaId, { limit }),
    });
    return data.data;
  },

  ventasPorUsuario: async (desde: string, hasta: string, tiendaId?: number | null): Promise<VentaPorUsuario[]> => {
    const { data } = await apiClient.get('/reportes/ventas-por-usuario', { params: rangoParams(desde, hasta, tiendaId) });
    return data.data;
  },

  ventasPorCaja: async (desde: string, hasta: string, tiendaId?: number | null): Promise<VentaPorCaja[]> => {
    const { data } = await apiClient.get('/reportes/ventas-por-caja', { params: rangoParams(desde, hasta, tiendaId) });
    return data.data;
  },

  resumenPorSucursal: async (tiendaId: number, desde: string, hasta: string): Promise<ResumenPorSucursal> => {
    const { data } = await apiClient.get(`/reportes/por-sucursal/${tiendaId}`, { params: { desde, hasta } });
    return data.data;
  },

  conciliacionCajaLista: async (
    desde: string,
    hasta: string,
    tiendaId?: number | null,
    limit = 30,
  ): Promise<ConciliacionCajaItem[]> => {
    const { data } = await apiClient.get('/reportes/conciliacion-caja', {
      params: rangoParams(desde, hasta, tiendaId, { limit }),
    });
    return data.data;
  },

  dgii607: async (periodo: string): Promise<void> => {
    const res = await apiClient.get('/reportes/dgii-607', {
      params: { periodo }, responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `607-${periodo}.txt`; a.click();
    URL.revokeObjectURL(url);
  },

  dgii606: async (periodo: string): Promise<void> => {
    const res = await apiClient.get('/reportes/dgii-606', {
      params: { periodo }, responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `606-${periodo}.txt`; a.click();
    URL.revokeObjectURL(url);
  },
};

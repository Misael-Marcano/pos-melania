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

export interface InventarioValorizado {
  articulos: {
    nombre: string; codigoBarras: string; cantidad: number;
    costo: number; precioVenta: number;
    valorCosto: number; valorVenta: number; categoria: string;
  }[];
  totales: {
    totalCosto: number; totalVenta: number;
    totalArticulos: number; totalUnidades: number; gananciaLatente: number;
  };
  porCategoria: { categoria: string; articulos: number; valorCosto: number }[];
}

export interface TopCliente {
  id: number; nombre: string; compania?: string;
  saldo: number; totalTransacciones: number; totalCompras: number;
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

export const reportesService = {
  ventasPorDia: async (desde: string, hasta: string): Promise<VentaDia[]> => {
    const { data } = await apiClient.get('/reportes/ventas-por-dia', { params: { desde, hasta } });
    return data.data;
  },

  topProductos: async (desde: string, hasta: string, limit = 10): Promise<TopProducto[]> => {
    const { data } = await apiClient.get('/reportes/top-productos', { params: { desde, hasta, limit } });
    return data.data;
  },

  resumenDia: async (fecha: string): Promise<ResumenDia> => {
    const { data } = await apiClient.get('/reportes/resumen-dia', { params: { fecha } });
    return data.data;
  },

  ganancias: async (desde: string, hasta: string): Promise<PnL> => {
    const { data } = await apiClient.get('/reportes/ganancias', { params: { desde, hasta } });
    return data.data;
  },

  inventarioValorizado: async (): Promise<InventarioValorizado> => {
    const { data } = await apiClient.get('/reportes/inventario-valorizado');
    return data.data;
  },

  topClientes: async (desde: string, hasta: string, limit = 10): Promise<TopCliente[]> => {
    const { data } = await apiClient.get('/reportes/top-clientes', { params: { desde, hasta, limit } });
    return data.data;
  },

  resumenPorSucursal: async (tiendaId: number, desde: string, hasta: string): Promise<ResumenPorSucursal> => {
    const { data } = await apiClient.get(`/reportes/por-sucursal/${tiendaId}`, { params: { desde, hasta } });
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

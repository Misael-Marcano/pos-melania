import type { AuthUser, ITienda, SaasContext } from '@pos/shared';
import type { PanelResumen } from '@/services/reportes.service';
import type { ICajaApertura } from '@/services/ventas.service';
import { isStaticSite } from '@/lib/site-mode';

export const STATIC_DEMO_SESSION_KEY = 'pos_static_demo';

export const STATIC_DEMO_USER: AuthUser = {
  id:        0,
  nombre:    'Usuario demo',
  email:     'demo@ejemplo.com',
  rol:       'admin',
  tenantId:  1,
};

export function isStaticDemoSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STATIC_DEMO_SESSION_KEY) === '1';
}

export function isStaticDemoActive(): boolean {
  return isStaticSite && isStaticDemoSession();
}

export function enterStaticDemo(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STATIC_DEMO_SESSION_KEY, '1');
}

export function exitStaticDemo(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STATIC_DEMO_SESSION_KEY);
}

function ventasPorDiaDemo(anchorFecha: string): PanelResumen['ventasPorDia'] {
  const end = new Date(`${anchorFecha}T12:00:00`);
  const rows: PanelResumen['ventasPorDia'] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const dia = d.toISOString().split('T')[0];
    rows.push({
      dia,
      totalVentas: 6 + (i % 8),
      totalMonto:  12_400 + (i % 6) * 2_850,
    });
  }
  return rows;
}

export function mockPanelResumen(fecha: string): PanelResumen {
  return {
    fecha,
    resumen: {
      totalTransacciones: 24,
      totalVentas:        48_750,
      totalEfectivo:      31_200,
      totalGastos:        2_100,
    },
    resumenAnterior: {
      totalTransacciones: 19,
      totalVentas:        39_400,
      totalEfectivo:      26_800,
      totalGastos:        1_850,
    },
    ventasPorDia: ventasPorDiaDemo(fecha),
    stockBajo: {
      count: 3,
      items: [
        { id: 1, nombre: 'Aceite 1L', cantidad: 4, codigoBarras: '750001' },
        { id: 2, nombre: 'Arroz 5 lb', cantidad: 6, codigoBarras: '750002' },
        { id: 3, nombre: 'Detergente', cantidad: 2, codigoBarras: '750003' },
      ],
    },
    cartera: {
      clientesConSaldo: 2,
      totalDeuda:       18_500,
      clientes: [
        { id: 1, nombre: 'Cliente mayorista SA', saldo: 12_000 },
        { id: 2, nombre: 'Distribuidora Norte', saldo: 6_500 },
      ],
    },
  };
}

export const MOCK_TIENDAS: ITienda[] = [
  { id: 1, nombre: 'Sucursal principal', activo: true },
  { id: 2, nombre: 'Sucursal centro', activo: true },
];

export const MOCK_CAJA_ABIERTA: ICajaApertura = {
  id:            1,
  cajaNombre:    'Caja 1',
  montoApertura: 5000,
  fechaApertura: '2026-05-18T08:00:00.000Z',
  abierta:       true,
  tienda:        { id: 1, nombre: 'Sucursal principal' },
};

export function mockSaasContext(): SaasContext {
  return {
    tenant: {
      id:       1,
      nombre:   'Mi empresa (demo)',
      slug:     'demo',
      planCode: 'standard',
      activo:   true,
    },
    limits: {
      code:         'standard',
      label:        'Standard',
      maxUsers:     15,
      maxTiendas:   5,
      maxArticulos: 5000,
      features: {
        kits:           true,
        cotizaciones:   true,
        promociones:    true,
        tarjetasRegalo: true,
        recetas:        true,
        compras:        true,
      },
    },
    usage: {
      seats:            4,
      tiendasActivas:   2,
      articulosActivos: 128,
      ventasMesActual:  312,
    },
    needsOnboarding: false,
    trial: {
      endsAt:          null,
      active:          false,
      expired:         false,
      daysRemaining:   null,
    },
  };
}

import {
  aggregateVentasPorMetodo,
  dgiiPeriodoBounds,
  computeGananciasResumen,
  computeCotizacionConversion,
  mesMtdBounds,
  mesAnteriorMtdBounds,
  pctVariacion,
  carteraBucketId,
  aggregateCarteraBuckets,
} from '../../modules/reportes/reportes-query';
import { sqlFechaDia, DEFAULT_REPORTES_TZ } from '../../modules/reportes/reportes-timezone';
import {
  reportesRangoFechasSchema,
  inventarioValorizadoQuerySchema,
  reportesPeriodoDgiiSchema,
  reportesCompararPeriodosSchema,
  reportesStockAlertaSchema,
} from '../../modules/reportes/dto/reportes.dto';

describe('aggregateVentasPorMetodo', () => {
  it('agrupa venta simple por metodoPago', () => {
    const r = aggregateVentasPorMetodo([
      { metodoPago: 'EFECTIVO', total: 100 },
      { metodoPago: 'TARJETA', total: 50 },
    ]);
    expect(r).toHaveLength(2);
    expect(r.find((x) => x.metodoPago === 'EFECTIVO')?.total).toBe(100);
  });

  it('desglosa pago mixto desde metodosPago JSON', () => {
    const r = aggregateVentasPorMetodo([
      {
        metodoPago: 'EFECTIVO',
        total: 300,
        metodosPago: JSON.stringify([
          { metodo: 'EFECTIVO', monto: 200 },
          { metodo: 'TARJETA', monto: 100 },
        ]),
      },
    ]);
    expect(r.find((x) => x.metodoPago === 'EFECTIVO')?.total).toBe(200);
    expect(r.find((x) => x.metodoPago === 'TARJETA')?.total).toBe(100);
  });
});

describe('reportesRangoFechasSchema', () => {
  it('rechaza rango invertido', () => {
    const r = reportesRangoFechasSchema.safeParse({
      desde: '2026-05-10',
      hasta: '2026-05-01',
    });
    expect(r.success).toBe(false);
  });

  it('acepta rango válido con tiendaId', () => {
    const r = reportesRangoFechasSchema.safeParse({
      desde: '2026-05-01',
      hasta: '2026-05-10',
      tiendaId: '3',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tiendaId).toBe(3);
  });
});

describe('dgiiPeriodoBounds', () => {
  it('devuelve primer y último día del mes', () => {
    const { desde, hasta } = dgiiPeriodoBounds('202605');
    expect(desde.getFullYear()).toBe(2026);
    expect(desde.getMonth()).toBe(4);
    expect(desde.getDate()).toBe(1);
    expect(hasta.getDate()).toBe(31);
    expect(hasta.getMonth()).toBe(4);
  });
});

describe('inventarioValorizadoQuerySchema', () => {
  it('aplica defaults de paginación', () => {
    const r = inventarioValorizadoQuerySchema.parse({});
    expect(r.page).toBe(1);
    expect(r.limit).toBe(25);
    expect(r.q).toBe('');
  });

  it('rechaza limit > 100', () => {
    expect(inventarioValorizadoQuerySchema.safeParse({ limit: 200 }).success).toBe(false);
  });
});

describe('reportesPeriodoDgiiSchema', () => {
  it('acepta YYYYMM válido', () => {
    expect(reportesPeriodoDgiiSchema.safeParse({ periodo: '202601' }).success).toBe(true);
  });
});

describe('mesMtdBounds / mesAnteriorMtdBounds', () => {
  it('MTD del mes de referencia', () => {
    expect(mesMtdBounds('2026-05-18')).toEqual({ desde: '2026-05-01', hasta: '2026-05-18' });
  });

  it('MTD mes anterior alineado al mismo día', () => {
    expect(mesAnteriorMtdBounds('2026-05-18')).toEqual({ desde: '2026-04-01', hasta: '2026-04-18' });
  });

  it('ajusta fin de mes en mes anterior (mar 31 → feb 28)', () => {
    expect(mesAnteriorMtdBounds('2026-03-31')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
  });
});

describe('pctVariacion', () => {
  it('calcula porcentaje', () => {
    expect(pctVariacion(120, 100)).toBe(20);
  });

  it('null si anterior es 0 y actual > 0', () => {
    expect(pctVariacion(50, 0)).toBeNull();
  });
});

describe('reportesCompararPeriodosSchema', () => {
  it('default referencia es hoy', () => {
    const r = reportesCompararPeriodosSchema.parse({});
    expect(r.referencia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('computeGananciasResumen', () => {
  it('calcula utilidad y márgenes con devoluciones', () => {
    const r = computeGananciasResumen({
      ingresos: 10000,
      costoVentas: 4000,
      gastos: 1500,
      devoluciones: 500,
    });
    expect(r.utilidadBruta).toBe(5500);
    expect(r.utilidadNeta).toBe(4000);
    expect(r.margenBruto).toBe(55);
    expect(r.margenNeto).toBe(40);
  });

  it('márgenes en cero sin ingresos', () => {
    const r = computeGananciasResumen({
      ingresos: 0,
      costoVentas: 0,
      gastos: 100,
      devoluciones: 0,
    });
    expect(r.margenBruto).toBe(0);
    expect(r.margenNeto).toBe(0);
    expect(r.utilidadNeta).toBe(-100);
  });
});

describe('carteraBucketId / aggregateCarteraBuckets', () => {
  it('asigna tramos por días', () => {
    expect(carteraBucketId(10)).toBe('0_30');
    expect(carteraBucketId(45)).toBe('31_60');
    expect(carteraBucketId(75)).toBe('61_90');
    expect(carteraBucketId(120)).toBe('90_plus');
    expect(carteraBucketId(null)).toBe('90_plus');
  });

  it('agrega totales por bucket', () => {
    const buckets = aggregateCarteraBuckets([
      { saldo: 100, diasAntiguedad: 5 },
      { saldo: 200, diasAntiguedad: 40 },
      { saldo: 50, diasAntiguedad: 100 },
    ]);
    expect(buckets.find((b) => b.id === '0_30')?.total).toBe(100);
    expect(buckets.find((b) => b.id === '31_60')?.total).toBe(200);
    expect(buckets.find((b) => b.id === '90_plus')?.total).toBe(50);
  });
});

describe('computeCotizacionConversion', () => {
  it('calcula tasa sobre cerradas', () => {
    const r = computeCotizacionConversion([
      { estado: 'ACEPTADA', cantidad: 3 },
      { estado: 'RECHAZADA', cantidad: 1 },
      { estado: 'ENVIADA', cantidad: 2 },
    ]);
    expect(r.aceptadas).toBe(3);
    expect(r.tasaCierre).toBe(75);
  });

  it('tasa null sin cerradas', () => {
    expect(computeCotizacionConversion([{ estado: 'BORRADOR', cantidad: 2 }]).tasaCierre).toBeNull();
  });
});

describe('sqlFechaDia', () => {
  it('usa Eastern Standard Time para RD por defecto', () => {
    expect(sqlFechaDia('v.fecha', DEFAULT_REPORTES_TZ)).toContain('Eastern Standard Time');
    expect(sqlFechaDia('v.fecha', DEFAULT_REPORTES_TZ)).toContain('v.fecha');
  });

  it('castea a datetime2 antes de AT TIME ZONE (columnas DATE)', () => {
    const sql = sqlFechaDia('fecha', DEFAULT_REPORTES_TZ);
    expect(sql).toMatch(/CAST\(fecha AS datetime2\) AT TIME ZONE/);
    expect(sql).toMatch(/AS DATE\)$/);
  });
});

describe('reportesStockAlertaSchema', () => {
  it('defaults umbral 5 y 90 días sin movimiento', () => {
    const r = reportesStockAlertaSchema.parse({});
    expect(r.umbral).toBe(5);
    expect(r.diasSinMovimiento).toBe(90);
    expect(r.limit).toBe(100);
  });

  it('rechaza umbral negativo', () => {
    expect(reportesStockAlertaSchema.safeParse({ umbral: -1 }).success).toBe(false);
  });
});

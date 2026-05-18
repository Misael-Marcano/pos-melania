/** Fragmentos SQL compartidos para agregaciones de reportes. */

/** Normaliza `dia` de SQL Server (ISO) a `YYYY-MM-DD` para el cliente. */
export function normalizeReporteDia(dia: unknown): string {
  if (dia instanceof Date) return dia.toISOString().slice(0, 10);
  return String(dia).trim().slice(0, 10);
}

export function stepIsoDate(base: string, deltaDays: number): string {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

/** Alias de tabla `ventas` = `v`. Excluye ventas marcadas con `[ANULADA]` en notas. */
export const VENTA_ACTIVA_SQL = `CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) = 0`;

/** Filtro opcional por sucursal vía `caja_aperturas` (alias `ca`). */
export function sqlTiendaOpcional(paramIndex: number): string {
  return `(@${paramIndex} IS NULL OR ca.tiendaId = @${paramIndex})`;
}

export interface VentaFilaMetodoPago {
  metodoPago: string;
  total: number | string;
  metodosPago?: string | null;
}

export interface VentasPorMetodoRow {
  metodoPago: string;
  cantidad: number;
  total: number;
}

/**
 * Agrega montos por método: usa JSON `metodosPago` en ventas mixtas;
 * si no, el total va al `metodoPago` principal.
 */
export function aggregateVentasPorMetodo(filas: VentaFilaMetodoPago[]): VentasPorMetodoRow[] {
  const totales: Record<string, number> = {};
  const cantidad: Record<string, number> = {};

  for (const row of filas) {
    const raw = row.metodosPago?.trim();
    let mixto: { metodo: string; monto: number }[] | null = null;
    if (raw && raw.length > 2) {
      try {
        const arr = JSON.parse(raw) as { metodo?: string; monto?: number }[];
        if (Array.isArray(arr) && arr.length > 1) {
          mixto = arr.map((p) => ({
            metodo: String(p.metodo ?? 'OTRO'),
            monto:  Number(p.monto ?? 0),
          }));
        }
      } catch { /* ignore JSON inválido */ }
    }

    if (mixto) {
      for (const p of mixto) {
        if (p.monto <= 0) continue;
        totales[p.metodo] = (totales[p.metodo] ?? 0) + p.monto;
        cantidad[p.metodo] = (cantidad[p.metodo] ?? 0) + 1;
      }
    } else {
      const k = row.metodoPago || 'OTRO';
      const m = Number(row.total) || 0;
      totales[k] = (totales[k] ?? 0) + m;
      cantidad[k] = (cantidad[k] ?? 0) + 1;
    }
  }

  return Object.entries(totales)
    .map(([metodoPago, total]) => ({
      metodoPago,
      total,
      cantidad: cantidad[metodoPago] ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mes calendario (1–12) y año de una fecha ISO. */
export function mesCalendarioDe(iso: string): { year: number; month: number } {
  const d = parseIsoDate(iso);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Rango MTD del mes de `referencia`: día 1 hasta `referencia` (inclusive).
 * Para comparar mes actual vs anterior con el mismo número de días.
 */
export function mesMtdBounds(referencia: string): { desde: string; hasta: string } {
  if (!ISO_DATE.test(referencia)) throw new Error('referencia debe ser YYYY-MM-DD');
  const d = parseIsoDate(referencia);
  const desde = new Date(d.getFullYear(), d.getMonth(), 1);
  return { desde: formatIsoDate(desde), hasta: referencia };
}

/** MTD del mes anterior alineado al mismo día del mes (o último día si no existe). */
export function mesAnteriorMtdBounds(referencia: string): { desde: string; hasta: string } {
  if (!ISO_DATE.test(referencia)) throw new Error('referencia debe ser YYYY-MM-DD');
  const d = parseIsoDate(referencia);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const prevMonthStart = new Date(year, month - 1, 1);
  const lastDayPrev = new Date(year, month, 0).getDate();
  const hastaDay = Math.min(day, lastDayPrev);
  const hasta = new Date(year, month - 1, hastaDay);
  return { desde: formatIsoDate(prevMonthStart), hasta: formatIsoDate(hasta) };
}

/** Etiqueta corta para UI, p. ej. "may 2026". */
export function mesEtiqueta(desde: string): string {
  const d = parseIsoDate(desde);
  return d.toLocaleDateString('es-DO', { month: 'short', year: 'numeric' });
}

/** Variación porcentual; null si el valor anterior es 0 y el actual también. */
export function pctVariacion(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return Number((((actual - anterior) / anterior) * 100).toFixed(1));
}

/** Límites inclusive del mes calendario YYYYMM (hora local del servidor). */
export function dgiiPeriodoBounds(periodo: string): { desde: Date; hasta: Date } {
  const year  = parseInt(periodo.substring(0, 4), 10);
  const month = parseInt(periodo.substring(4, 6), 10);
  return {
    desde: new Date(year, month - 1, 1),
    hasta: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export type GananciasInputs = {
  ingresos: number;
  costoVentas: number;
  gastos: number;
  devoluciones: number;
};

/** Utilidades y márgenes del reporte P&L (sin I/O). */
/** Tramos de antigüedad para cartera (días desde la venta a crédito más antigua). */
export const CARTERA_BUCKETS = [
  { id: '0_30',    etiqueta: '0–30 días',      minDias: 0,  maxDias: 30 },
  { id: '31_60',   etiqueta: '31–60 días',     minDias: 31, maxDias: 60 },
  { id: '61_90',   etiqueta: '61–90 días',     minDias: 61, maxDias: 90 },
  { id: '90_plus', etiqueta: 'Más de 90 días', minDias: 91, maxDias: null as number | null },
] as const;

export type CarteraBucketId = (typeof CARTERA_BUCKETS)[number]['id'];

/** Asigna un saldo a un tramo según días de antigüedad (null → sin venta crédito registrada). */
export function carteraBucketId(diasAntiguedad: number | null): CarteraBucketId {
  if (diasAntiguedad == null || diasAntiguedad < 0) return '90_plus';
  if (diasAntiguedad <= 30) return '0_30';
  if (diasAntiguedad <= 60) return '31_60';
  if (diasAntiguedad <= 90) return '61_90';
  return '90_plus';
}

export interface CarteraClienteFila {
  saldo: number;
  diasAntiguedad: number | null;
}

export interface CarteraBucketResumen {
  id: CarteraBucketId;
  etiqueta: string;
  clientes: number;
  total: number;
}

/** Totales por tramo a partir de filas de clientes con saldo. */
export function aggregateCarteraBuckets(
  clientes: CarteraClienteFila[],
): CarteraBucketResumen[] {
  const map = new Map<CarteraBucketId, { clientes: number; total: number }>();
  for (const b of CARTERA_BUCKETS) {
    map.set(b.id, { clientes: 0, total: 0 });
  }
  for (const c of clientes) {
    const id = carteraBucketId(c.diasAntiguedad);
    const row = map.get(id)!;
    row.clientes += 1;
    row.total += Number(c.saldo);
  }
  return CARTERA_BUCKETS.map((b) => ({
    id: b.id,
    etiqueta: b.etiqueta,
    clientes: map.get(b.id)!.clientes,
    total: map.get(b.id)!.total,
  }));
}

export interface CotizacionEstadoFila {
  estado: string;
  cantidad: number;
}

/** Tasa de aceptación sobre cotizaciones cerradas (aceptada / aceptada+rechazada+vencida). */
export function computeCotizacionConversion(porEstado: CotizacionEstadoFila[]): {
  aceptadas: number;
  rechazadas: number;
  vencidas: number;
  enviadas: number;
  borrador: number;
  tasaCierre: number | null;
} {
  const n = (e: string) =>
    Number(porEstado.find((x) => x.estado === e)?.cantidad ?? 0);
  const aceptadas = n('ACEPTADA');
  const rechazadas = n('RECHAZADA');
  const vencidas = n('VENCIDA');
  const enviadas = n('ENVIADA');
  const borrador = n('BORRADOR');
  const cerradas = aceptadas + rechazadas + vencidas;
  const tasaCierre = cerradas > 0 ? Number(((aceptadas / cerradas) * 100).toFixed(1)) : null;
  return { aceptadas, rechazadas, vencidas, enviadas, borrador, tasaCierre };
}

export function computeGananciasResumen(input: GananciasInputs) {
  const ingresos = Number(input.ingresos);
  const costoVentas = Number(input.costoVentas);
  const gastos = Number(input.gastos);
  const devoluciones = Number(input.devoluciones);
  const utilidadBruta = ingresos - costoVentas - devoluciones;
  const utilidadNeta = utilidadBruta - gastos;
  const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0;
  const margenNeto = ingresos > 0 ? (utilidadNeta / ingresos) * 100 : 0;
  return {
    ingresos,
    costoVentas,
    devoluciones,
    utilidadBruta,
    gastos,
    utilidadNeta,
    margenBruto: Number(margenBruto.toFixed(2)),
    margenNeto: Number(margenNeto.toFixed(2)),
  };
}

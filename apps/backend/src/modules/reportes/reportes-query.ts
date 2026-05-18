/** Fragmentos SQL compartidos para agregaciones de reportes. */

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

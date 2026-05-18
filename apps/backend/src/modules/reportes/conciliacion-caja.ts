import type { DataSource } from 'typeorm';
import { AppError } from '../../middlewares/error.middleware';
import { sqlFechaDia } from './reportes-timezone';

/** @0 desde @1 hasta @2 aperturaId @3 tenantId — alineado con VentasService.resumenCaja */
export const VENTAS_SESION_WHERE = `
  v.fecha >= @0 AND v.fecha <= @1
  AND CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) = 0
  AND EXISTS (
    SELECT 1 FROM usuarios vu
    WHERE vu.id = v.usuarioId AND vu.tenantId = @3
  )
  AND (
    v.cajaAperturaId = @2
    OR (
      v.cajaAperturaId IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM ventas t
        WHERE t.cajaAperturaId = @2
          AND t.fecha >= @0 AND t.fecha <= @1
      )
    )
  )`;

export interface ConciliacionCajaInput {
  montoApertura: number;
  montoCierre: number | null;
  totalEfectivo: number;
  totalGastos: number;
  totalVentas: number;
  cantidadVentas: number;
  cerrada: boolean;
}

export interface ConciliacionCajaComputed {
  efectivoEsperado: number;
  /** Conteo físico (montoCierre) menos efectivo esperado en caja */
  diferencia: number | null;
  /** Solo informativo: cierre menos apertura (no es la conciliación operativa) */
  diferenciaVsApertura: number | null;
  cuadra: boolean | null;
  alerta: string | null;
}

export type ConciliacionCajaResumen = ConciliacionCajaInput & ConciliacionCajaComputed;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Efectivo esperado = apertura + ventas efectivo − gastos del período (CHECKLIST-CAJA). */
export function computeConciliacionCaja(input: ConciliacionCajaInput): ConciliacionCajaComputed {
  const efectivoEsperado = round2(
    input.montoApertura + input.totalEfectivo - input.totalGastos,
  );
  const cerrada = input.cerrada && input.montoCierre != null;
  const diferencia = cerrada ? round2(input.montoCierre! - efectivoEsperado) : null;
  const diferenciaVsApertura = cerrada ? round2(input.montoCierre! - input.montoApertura) : null;
  const cuadra = diferencia != null ? Math.abs(diferencia) < 0.01 : null;
  let alerta: string | null = null;
  if (diferencia != null && cuadra === false) {
    alerta = diferencia > 0 ? 'Sobrante en caja' : 'Faltante en caja';
  }
  return { efectivoEsperado, diferencia, diferenciaVsApertura, cuadra, alerta };
}

export interface ConciliacionCajaDetalle extends ConciliacionCajaResumen {
  aperturaId: number;
  cajaNombre: string;
  tiendaNombre: string | null;
  fechaApertura: string;
  fechaCierre: string | null;
  nota: string;
}

type AperturaRow = {
  id: number;
  cajaNombre: string;
  montoApertura: number;
  montoCierre: number | null;
  fechaApertura: Date;
  fechaCierre: Date | null;
  abierta: boolean;
  tiendaId: number | null;
  tiendaNombre: string | null;
};

async function loadApertura(
  ds: DataSource,
  aperturaId: number,
  tenantId: number,
): Promise<AperturaRow> {
  const rows = await ds.query(
    `SELECT ca.id, ca.cajaNombre, ca.montoApertura, ca.montoCierre,
            ca.fechaApertura, ca.fechaCierre, ca.abierta,
            COALESCE(ca.tiendaId, c.tiendaId) AS tiendaId,
            COALESCE(t.nombre, tc.nombre) AS tiendaNombre
     FROM caja_aperturas ca
     LEFT JOIN tiendas t ON t.id = ca.tiendaId
     LEFT JOIN cajas c ON c.id = ca.cajaId
     LEFT JOIN tiendas tc ON tc.id = c.tiendaId
     WHERE ca.id = @0
       AND (t.tenantId = @1 OR tc.tenantId = @1)`,
    [aperturaId, tenantId],
  );
  if (!rows?.length) throw new AppError('Sesión de caja no encontrada', 404);
  return rows[0] as AperturaRow;
}

async function sessionTotals(
  ds: DataSource,
  ap: AperturaRow,
  tenantId: number,
): Promise<{ totalEfectivo: number; totalGastos: number; totalVentas: number; cantidadVentas: number }> {
  const desde = ap.fechaApertura;
  const hasta = !ap.abierta && ap.fechaCierre ? ap.fechaCierre : new Date();
  const p = [desde, hasta, ap.id, tenantId];
  const vw = VENTAS_SESION_WHERE;

  const [efectivo] = await ds.query(
    `SELECT ISNULL(SUM(v.total), 0) AS totalEfectivo
     FROM ventas v WHERE ${vw} AND v.metodoPago = 'EFECTIVO'`,
    p,
  );

  const tiendaId = ap.tiendaId;
  const [gastosSum] = tiendaId
    ? await ds.query(
      `SELECT ISNULL(SUM(g.cantidad), 0) AS totalGastos
       FROM gastos g
       WHERE g.fecha >= @0 AND g.fecha <= @1
         AND g.tenantId = @3
         AND (g.tiendaId IS NULL OR g.tiendaId = @2)`,
      [desde, hasta, tiendaId, tenantId],
    )
    : await ds.query(
      `SELECT ISNULL(SUM(g.cantidad), 0) AS totalGastos
       FROM gastos g
       WHERE g.fecha >= @0 AND g.fecha <= @1 AND g.tenantId = @2`,
      [desde, hasta, tenantId],
    );

  const [cnt] = await ds.query(
    `SELECT COUNT(*) AS n, ISNULL(SUM(v.total), 0) AS t FROM ventas v WHERE ${vw}`,
    p,
  );

  return {
    totalEfectivo: Number(efectivo?.totalEfectivo ?? 0),
    totalGastos: Number(gastosSum?.totalGastos ?? 0),
    totalVentas: Number(cnt?.t ?? 0),
    cantidadVentas: Number(cnt?.n ?? 0),
  };
}

function buildResumen(
  ap: AperturaRow,
  totals: { totalEfectivo: number; totalGastos: number; totalVentas: number; cantidadVentas: number },
): ConciliacionCajaResumen {
  const input: ConciliacionCajaInput = {
    montoApertura: Number(ap.montoApertura),
    montoCierre: ap.montoCierre != null ? Number(ap.montoCierre) : null,
    totalEfectivo: totals.totalEfectivo,
    totalGastos: totals.totalGastos,
    totalVentas: totals.totalVentas,
    cantidadVentas: totals.cantidadVentas,
    cerrada: !ap.abierta && ap.fechaCierre != null,
  };
  return { ...input, ...computeConciliacionCaja(input) };
}

export async function fetchConciliacionCaja(
  ds: DataSource,
  aperturaId: number,
  tenantId: number,
): Promise<ConciliacionCajaDetalle> {
  const ap = await loadApertura(ds, aperturaId, tenantId);
  const totals = await sessionTotals(ds, ap, tenantId);
  const resumen = buildResumen(ap, totals);
  return {
    aperturaId: ap.id,
    cajaNombre: ap.cajaNombre,
    tiendaNombre: ap.tiendaNombre ?? null,
    fechaApertura: ap.fechaApertura instanceof Date
      ? ap.fechaApertura.toISOString()
      : String(ap.fechaApertura),
    fechaCierre: ap.fechaCierre
      ? (ap.fechaCierre instanceof Date ? ap.fechaCierre.toISOString() : String(ap.fechaCierre))
      : null,
    nota: 'Efectivo esperado = apertura + ventas en efectivo − gastos del período de sesión.',
    ...resumen,
  };
}

export async function fetchConciliacionCajaBatch(
  ds: DataSource,
  aperturaIds: number[],
  tenantId: number,
): Promise<Map<number, ConciliacionCajaResumen>> {
  const map = new Map<number, ConciliacionCajaResumen>();
  if (!aperturaIds.length) return map;
  const unique = [...new Set(aperturaIds)];
  await Promise.all(
    unique.map(async (id) => {
      try {
        const ap = await loadApertura(ds, id, tenantId);
        if (ap.abierta || !ap.fechaCierre) return;
        const totals = await sessionTotals(ds, ap, tenantId);
        map.set(id, buildResumen(ap, totals));
      } catch {
        /* sesión ajena o inexistente — omitir */
      }
    }),
  );
  return map;
}

export interface ConciliacionCajaListItem extends ConciliacionCajaDetalle {}

export async function listConciliacionCaja(
  ds: DataSource,
  desde: string,
  hasta: string,
  tenantId: number,
  tiendaId: number | null,
  limit = 50,
): Promise<ConciliacionCajaListItem[]> {
  const tiendaFilter = tiendaId != null ? 'AND ca.tiendaId = @3' : '';
  const params: (string | number)[] = [desde, hasta, tenantId];
  if (tiendaId != null) params.push(tiendaId);

  const rows = await ds.query(
    `SELECT TOP (${Math.min(limit, 100)}) ca.id
     FROM caja_aperturas ca
     INNER JOIN tiendas t ON t.id = ca.tiendaId AND t.tenantId = @2
     WHERE ca.abierta = 0
       AND ca.fechaCierre IS NOT NULL
       AND ${sqlFechaDia('ca.fechaCierre')} BETWEEN @0 AND @1
       ${tiendaFilter}
     ORDER BY ca.fechaCierre DESC`,
    params,
  );

  const items: ConciliacionCajaListItem[] = [];
  for (const row of rows ?? []) {
    const det = await fetchConciliacionCaja(ds, Number(row.id), tenantId);
    items.push(det);
  }
  return items;
}

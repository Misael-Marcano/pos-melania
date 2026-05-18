import type { CajaApertura } from '../../entities/CajaApertura.entity';
import type { ConciliacionCajaResumen } from '../reportes/conciliacion-caja';

/** Sesiones creadas por tests de integración (`INTEG-*`, `INTEG-PLAN-*`, etc.). */
const INTEGRATION_CAJA_RE = /^INTEG/i;

export function isIntegrationCajaSession(cajaNombre: string): boolean {
  return INTEGRATION_CAJA_RE.test(cajaNombre.trim());
}

/** Serializa fechas de SQL/TypeORM a ISO UTC para el cliente. */
export function serializeCajaFecha(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export type CajaHistorialRow = {
  id: number;
  cajaNombre: string;
  montoApertura: number;
  montoCierre?: number;
  fechaApertura: string;
  fechaCierre?: string;
  abierta: boolean;
  datosInconsistentes: boolean;
  totalVentas: number;
  conciliacion?: ConciliacionCajaResumen | null;
  usuario?: { id: number; nombre: string };
  tienda?: { id: number; nombre: string };
  caja?: { id: number; nombre: string };
};

export function mapCajaAperturaHistorial(
  ca: CajaApertura,
  totalVentas = 0,
  conciliacion: ConciliacionCajaResumen | null = null,
): CajaHistorialRow {
  const fechaApertura = serializeCajaFecha(ca.fechaApertura)!;
  const fechaCierre = serializeCajaFecha(ca.fechaCierre);
  const datosInconsistentes =
    fechaCierre != null &&
    new Date(fechaCierre).getTime() < new Date(fechaApertura).getTime();

  const tienda =
    ca.tienda != null
      ? { id: ca.tienda.id, nombre: ca.tienda.nombre }
      : ca.caja?.tienda != null
        ? { id: ca.caja.tienda.id, nombre: ca.caja.tienda.nombre }
        : undefined;

  return {
    id:                ca.id,
    cajaNombre:        ca.cajaNombre,
    montoApertura:     Number(ca.montoApertura),
    montoCierre:       ca.montoCierre != null ? Number(ca.montoCierre) : undefined,
    fechaApertura,
    fechaCierre,
    abierta:           ca.abierta,
    datosInconsistentes,
    totalVentas,
    conciliacion: conciliacion ?? undefined,
    usuario: ca.usuario
      ? { id: ca.usuario.id, nombre: ca.usuario.nombre }
      : undefined,
    tienda,
    caja: ca.caja ? { id: ca.caja.id, nombre: ca.caja.nombre } : undefined,
  };
}

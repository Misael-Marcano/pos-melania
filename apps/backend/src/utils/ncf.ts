import { AppDataSource } from '../config/database';
import { Comprobante } from '../entities/Comprobante.entity';
import { TipoComprobante } from '@pos/shared';
import { EntityManager } from 'typeorm';
import { AppError } from '../middlewares/error.middleware';

/** Últimos 8 caracteres de una secuencia guardada como "00000001" o NCF completo "B0200000001". */
export const parseNcfSequenceTail = (secuenciaOrNcf: string): number =>
  parseInt(secuenciaOrNcf.slice(-8), 10);

/** NCF: serie + tipo (2) + secuencia (8), p. ej. B0200000001. */
export const buildNcf = (series: string, tipo: TipoComprobante, sequence: number): string =>
  `${series}${tipo.padStart(2, '0')}${String(sequence).padStart(8, '0')}`;

/** Extrae el tipo (2 dígitos) de un NCF completo, p. ej. B0200012501 → 02. */
export const parseNcfTipo = (ncf: string): string | null => {
  const m = ncf.trim().toUpperCase().match(/^[A-Z](\d{2})\d{8}$/);
  return m?.[1] ?? null;
};

/** Normaliza secuencia actual al formato NCF completo coherente con serie/tipo. */
export const normalizeSecuenciaActual = (
  series: string,
  tipo: TipoComprobante,
  secuenciaActual: string,
): string => {
  const seq = parseNcfSequenceTail(secuenciaActual);
  if (Number.isNaN(seq)) {
    throw new AppError('Secuencia actual inválida', 400);
  }
  return buildNcf(series, tipo, seq);
};

export const assertSecuenciaEnRango = (
  secuenciaActual: string,
  desde: string,
  hasta: string,
  label = 'Secuencia',
): void => {
  const actual = parseNcfSequenceTail(secuenciaActual);
  const d = parseNcfSequenceTail(desde);
  const h = parseNcfSequenceTail(hasta);
  if (Number.isNaN(actual) || Number.isNaN(d) || Number.isNaN(h)) {
    throw new AppError(`${label}: valores numéricos inválidos`, 400);
  }
  if (d > h) {
    throw new AppError(`${label}: "desde" no puede ser mayor que "hasta"`, 400);
  }
  if (actual < d) {
    throw new AppError(
      `${label}: la secuencia actual (${actual}) está antes del inicio autorizado (${d})`,
      400,
    );
  }
  if (actual > h) {
    throw new AppError(`${label}: la secuencia actual (${actual}) supera el fin autorizado (${h})`, 400);
  }
};

/**
 * Genera el próximo NCF para el tipo indicado dentro de una transacción.
 * Pasar `manager` garantiza que el incremento se revierte si la transacción falla.
 * Ejemplo salida: B0200000001
 */
export const generarNCF = async (
  tipo: TipoComprobante,
  manager?: EntityManager,
  tenantId = 1,
): Promise<string> => {
  const repo = manager
    ? manager.getRepository(Comprobante)
    : AppDataSource.getRepository(Comprobante);

  const comprobante = await repo.findOne({
    where: { tipo, activo: true, tenant: { id: tenantId } },
    lock: manager ? { mode: 'pessimistic_write' } : undefined,
  });
  if (!comprobante) {
    throw new AppError(`No hay comprobante activo registrado para el tipo ${tipo}`, 400);
  }

  if (comprobante.tipo !== tipo) {
    throw new AppError('Inconsistencia en la serie fiscal seleccionada', 500);
  }

  const secActual = parseNcfSequenceTail(comprobante.secuenciaActual);
  const secDesde  = parseNcfSequenceTail(comprobante.desde);
  const secHasta  = parseNcfSequenceTail(comprobante.hasta);

  if (Number.isNaN(secActual)) {
    throw new AppError(`Secuencia actual inválida para comprobante tipo ${tipo}`, 500);
  }
  if (secActual < secDesde) {
    throw new AppError(
      `La secuencia actual (${secActual}) está antes del rango autorizado (${secDesde}) para tipo ${tipo}. Actualice el comprobante en Configuración.`,
      400,
    );
  }
  if (secActual > secHasta) {
    throw new AppError(`Secuencia de comprobante tipo ${tipo} agotada`, 400);
  }

  const ncf = buildNcf(comprobante.series, tipo, secActual);

  const tipoEnNcf = parseNcfTipo(ncf);
  if (tipoEnNcf !== tipo) {
    throw new AppError('Error al construir el NCF fiscal', 500);
  }

  const siguiente = secActual + 1;
  comprobante.secuenciaActual = buildNcf(comprobante.series, tipo, siguiente);
  await repo.save(comprobante);

  return ncf;
};
